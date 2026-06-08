import {
  JwtAuthGuard,
  PoliciesGuard,
  RequirePolicy,
  SubscriptionRequiredPolicy,
} from '@libs/common';
import { Body, Controller, Get, HttpException, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { ServiceRegistryService } from '../../../infrastructure/config/service-registry.service';
import { HttpProxyService } from '../../../infrastructure/http/http-proxy.service';

type ForumUser = {
  sub?: string;
  email?: string;
  name?: string;
  nickname?: string;
};

type AuthenticatedRequest = FastifyRequest & { user?: ForumUser };

@Controller({ path: 'forum', version: '1' })
@UseGuards(JwtAuthGuard, PoliciesGuard)
@RequirePolicy(SubscriptionRequiredPolicy)
export class ForumProxyController {
  constructor(
    private readonly proxy: HttpProxyService,
    private readonly registry: ServiceRegistryService,
  ) {}

  @Get()
  getForum(@Req() req: AuthenticatedRequest) {
    return this.proxy.forward(req, {
      service: 'interaction',
      path: '/v1/forum',
      method: 'GET',
    });
  }

  @Post('topics')
  createTopic(@Req() req: AuthenticatedRequest, @Body() body: Record<string, unknown>) {
    return this.proxy.forward(req, {
      service: 'interaction',
      path: '/v1/forum/topics',
      method: 'POST',
      body: {
        ...body,
        userId: req.user?.sub,
        authorName: this.resolveAuthorName(req.user),
      },
    });
  }

  @Post('messages')
  createMessage(@Req() req: AuthenticatedRequest, @Body() body: Record<string, unknown>) {
    return this.proxy.forward(req, {
      service: 'interaction',
      path: '/v1/forum/messages',
      method: 'POST',
      body: {
        ...body,
        userId: req.user?.sub,
        authorName: this.resolveAuthorName(req.user),
      },
    });
  }

  @Get('events')
  async streamForum(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const upstreamUrl = `${this.registry.getUrl('interaction')}/v1/forum/events`;
    const controller = new AbortController();

    req.raw.on('close', () => controller.abort());

    let response: Response;
    try {
      response = await fetch(upstreamUrl, {
        method: 'GET',
        headers: {
          ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
        },
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        reply.raw.end();
        return;
      }
      throw error;
    }

    if (!response.ok) {
      throw new HttpException('Forum stream unavailable', response.status);
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
    } catch (error) {
      if (!controller.signal.aborted) {
        throw error;
      }
    } finally {
      reader.releaseLock();
      if (!reply.raw.destroyed) {
        reply.raw.end();
      }
    }
  }

  private resolveAuthorName(user?: ForumUser): string | undefined {
    return user?.name ?? user?.nickname ?? user?.email;
  }
}
