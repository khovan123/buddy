import { shouldUseCloudRunAuth } from '@libs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { GoogleAuth, IdTokenClient } from 'google-auth-library';
import type { FastifyReply, FastifyRequest } from 'fastify';

type EventStreamProxyOptions = {
  label: string;
  upstreamUrl: string;
};

const googleAuth = new GoogleAuth();
const idTokenClients = new Map<string, IdTokenClient>();

async function getCloudRunAuthHeader(upstreamUrl: string): Promise<Record<string, string>> {
  if (!shouldUseCloudRunAuth(upstreamUrl)) {
    return {};
  }

  const audience = new URL(upstreamUrl).origin;
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

export async function proxyEventStream(
  req: FastifyRequest,
  reply: FastifyReply,
  options: EventStreamProxyOptions,
) {
  const controller = new AbortController();

  req.raw.on('close', () => controller.abort());

  let response: Response;
  try {
    const cloudRunAuthHeaders = await getCloudRunAuthHeader(options.upstreamUrl);
    response = await fetch(options.upstreamUrl, {
      method: 'GET',
      headers: {
        ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
        ...cloudRunAuthHeaders,
      },
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) {
      reply.raw.end();
      return;
    }

    throw new HttpException(`${options.label} stream unavailable`, HttpStatus.BAD_GATEWAY);
  }

  if (!response.ok) {
    throw new HttpException(`${options.label} stream unavailable`, response.status);
  }

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  if (!response.body) {
    reply.raw.end();
    return;
  }

  const reader = response.body.getReader();
  try {
    while (!controller.signal.aborted) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      reply.raw.write(Buffer.from(value));
    }
  } catch {
    if (!controller.signal.aborted && !reply.raw.headersSent) {
      throw new HttpException(`${options.label} stream unavailable`, HttpStatus.BAD_GATEWAY);
    }
  } finally {
    reader.releaseLock();
    if (!reply.raw.destroyed) {
      reply.raw.end();
    }
  }
}
