import { AppLogger, shouldUseCloudRunAuth, type JwtPayload } from '@libs/common';
import { JwtService } from '@nestjs/jwt';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { GoogleAuth, type IdTokenClient } from 'google-auth-library';
import type { IncomingMessage } from 'node:http';
import { WebSocketServer, WebSocket, type RawData } from 'ws';

import { ServiceRegistryService } from '../../infrastructure/config/service-registry.service';

type ForumUser = JwtPayload & {
  name?: string;
  nickname?: string;
};

type ForumSocketRequest = {
  id?: string;
  type?: string;
  payload?: Record<string, unknown>;
};

type ForumSocketResponse = {
  id?: string;
  type: 'forum.response' | 'forum.error' | 'forum.topic' | 'forum.message' | 'forum.presence';
  ok?: boolean;
  status?: number;
  data?: unknown;
  error?: string;
};

type UpstreamRequest = {
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
};

const googleAuth = new GoogleAuth();
const idTokenClients = new Map<string, IdTokenClient>();

export function registerForumWebSocket(app: NestFastifyApplication, logger: AppLogger) {
  const server = app.getHttpServer();
  const jwtService = app.get(JwtService);
  const registry = app.get(ServiceRegistryService);
  const wss = new WebSocketServer({ noServer: true });
  const onlineUsers = new Map<string, number>();

  function broadcastPresence() {
    broadcast(wss, {
      type: 'forum.presence',
      data: { onlineUsers: onlineUsers.size },
    });
  }

  server.on('upgrade', async (request, socket, head) => {
    const url = new URL(request.url ?? '/', 'http://localhost');

    if (url.pathname !== '/v1/forum/ws') {
      return;
    }

    const token = extractToken(request.headers.authorization, url.searchParams.get('token'));
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    let user: ForumUser;
    try {
      user = await jwtService.verifyAsync<ForumUser>(token);
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, { token, user });
    });
  });

  wss.on(
    'connection',
    (
      ws: WebSocket,
      _request: IncomingMessage,
      context: {
        token: string;
        user: ForumUser;
      },
    ) => {
      const streamController = new AbortController();
      const currentConnections = onlineUsers.get(context.user.sub) ?? 0;
      onlineUsers.set(context.user.sub, currentConnections + 1);
      broadcastPresence();
      void forwardForumStream(ws, registry, context.token, streamController.signal, logger);

      ws.on('message', (raw) => {
        void handleForumMessage(ws, registry, context, raw, logger);
      });

      ws.on('close', () => {
        streamController.abort();
        const remainingConnections = (onlineUsers.get(context.user.sub) ?? 1) - 1;
        if (remainingConnections > 0) {
          onlineUsers.set(context.user.sub, remainingConnections);
        } else {
          onlineUsers.delete(context.user.sub);
        }
        broadcastPresence();
      });
    },
  );

  return wss;
}

function extractToken(authorization?: string, queryToken?: string | null) {
  const [type, token] = authorization?.split(' ') ?? [];
  if (type === 'Bearer' && token) {
    return token;
  }
  return queryToken || undefined;
}

async function handleForumMessage(
  ws: WebSocket,
  registry: ServiceRegistryService,
  context: { token: string; user: ForumUser },
  raw: RawData,
  logger: AppLogger,
) {
  let request: ForumSocketRequest;
  try {
    request = JSON.parse(raw.toString()) as ForumSocketRequest;
  } catch {
    send(ws, {
      type: 'forum.error',
      ok: false,
      status: 400,
      error: 'Invalid forum socket message',
    });
    return;
  }

  try {
    const upstream = toUpstreamRequest(request, context.user);
    const data = await callInteraction(registry, context.token, upstream);
    send(ws, {
      id: request.id,
      type: 'forum.response',
      ok: true,
      data,
    });
  } catch (error) {
    logger.warn(
      `Forum socket command failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    send(ws, {
      id: request.id,
      type: 'forum.response',
      ok: false,
      status: error instanceof UpstreamError ? error.status : 500,
      error: error instanceof Error ? error.message : 'Forum command failed',
    });
  }
}

function toUpstreamRequest(request: ForumSocketRequest, user: ForumUser): UpstreamRequest {
  const payload = request.payload ?? {};

  switch (request.type) {
    case 'forum.bootstrap':
      return {
        method: 'GET',
        path: '/v1/forum',
        query: { viewerId: user.sub },
      };
    case 'forum.topic.create':
      return {
        method: 'POST',
        path: '/v1/forum/topics',
        body: {
          title: String(payload.title ?? ''),
          excerpt: String(payload.excerpt ?? ''),
          majorId: String(payload.majorId ?? ''),
          tag: String(payload.tag ?? ''),
          userId: user.sub,
          authorName: resolveAuthorName(user),
        },
      };
    case 'forum.message.create':
      return {
        method: 'POST',
        path: '/v1/forum/messages',
        body: {
          message: String(payload.message ?? ''),
          mentions: Array.isArray(payload.mentions) ? payload.mentions : [],
          userId: user.sub,
          authorName: resolveAuthorName(user),
        },
      };
    case 'forum.topic.view':
      return {
        method: 'PATCH',
        path: `/v1/forum/topics/${encodeURIComponent(String(payload.topicId ?? ''))}/view`,
        body: {
          userId: user.sub,
        },
      };
    case 'forum.topic.react':
      return {
        method: 'POST',
        path: `/v1/forum/topics/${encodeURIComponent(String(payload.topicId ?? ''))}/reactions`,
        body: {
          reaction: payload.reaction,
          userId: user.sub,
        },
      };
    case 'forum.reply.create':
      return {
        method: 'POST',
        path: `/v1/forum/topics/${encodeURIComponent(String(payload.topicId ?? ''))}/messages`,
        body: {
          message: String(payload.message ?? ''),
          mentions: Array.isArray(payload.mentions) ? payload.mentions : [],
          userId: user.sub,
          authorName: resolveAuthorName(user),
        },
      };
    default:
      throw new UpstreamError('Unknown forum socket command', 400);
  }
}

async function callInteraction(
  registry: ServiceRegistryService,
  token: string,
  request: UpstreamRequest,
) {
  const baseUrl = registry.getUrl('interaction');
  const queryString = request.query ? `?${new URLSearchParams(request.query)}` : '';
  const cloudRunAuthHeaders = await getCloudRunAuthHeader(baseUrl);
  const response = await fetch(`${baseUrl}${request.path}${queryString}`, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...cloudRunAuthHeaders,
      ...(request.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: request.body ? JSON.stringify(request.body) : undefined,
  });
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = extractUpstreamErrorMessage(
      payload,
      `Forum upstream returned HTTP ${response.status}`,
    );
    throw new UpstreamError(message, response.status);
  }

  return payload;
}

async function forwardForumStream(
  ws: WebSocket,
  registry: ServiceRegistryService,
  token: string,
  signal: AbortSignal,
  logger: AppLogger,
) {
  try {
    const baseUrl = registry.getUrl('interaction');
    const cloudRunAuthHeaders = await getCloudRunAuthHeader(baseUrl);
    const response = await fetch(`${registry.getUrl('interaction')}/v1/forum/events`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...cloudRunAuthHeaders,
      },
      signal,
    });

    if (!response.ok || !response.body) {
      send(ws, {
        type: 'forum.error',
        ok: false,
        status: response.status,
        error: 'Forum stream unavailable',
      });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (!signal.aborted && ws.readyState === WebSocket.OPEN) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';

      for (const chunk of chunks) {
        const event = parseSseEvent(chunk);
        if (event) {
          send(ws, event);
        }
      }
    }

    reader.releaseLock();
  } catch (error) {
    if (!signal.aborted) {
      logger.warn(
        `Forum socket stream failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

function parseSseEvent(chunk: string): ForumSocketResponse | null {
  const eventLine = chunk.split('\n').find((line) => line.startsWith('event:'));
  const dataLine = chunk.split('\n').find((line) => line.startsWith('data:'));
  const type = eventLine?.slice('event:'.length).trim();
  const dataRaw = dataLine?.slice('data:'.length).trim();

  if (type !== 'forum.topic' && type !== 'forum.message') {
    return null;
  }

  return {
    type,
    data: dataRaw ? JSON.parse(dataRaw) : undefined,
  };
}

function send(ws: WebSocket, message: ForumSocketResponse) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(wss: WebSocketServer, message: ForumSocketResponse) {
  wss.clients.forEach((client) => send(client, message));
}

function resolveAuthorName(user?: ForumUser): string | undefined {
  return user?.name ?? user?.nickname ?? user?.email;
}

async function getCloudRunAuthHeader(serviceBaseUrl: string): Promise<Record<string, string>> {
  if (!shouldUseCloudRunAuth(serviceBaseUrl)) {
    return {};
  }

  const audience = new URL(serviceBaseUrl).origin;
  let client = idTokenClients.get(audience);
  if (!client) {
    client = await googleAuth.getIdTokenClient(audience);
    idTokenClients.set(audience, client);
  }

  const headers = await client.getRequestHeaders();
  const authorization =
    headers.get('Authorization') ?? headers.get('authorization') ?? headers.get('AUTHORIZATION');

  return authorization ? { 'X-Serverless-Authorization': authorization } : {};
}

function extractUpstreamErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const body = payload as Record<string, unknown>;
  const message = body.message;
  if (typeof message === 'string') {
    return message;
  }
  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
    return message.join(', ');
  }

  for (const key of ['error', 'detail', 'details']) {
    const value = body[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return fallback;
  }
}

class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
