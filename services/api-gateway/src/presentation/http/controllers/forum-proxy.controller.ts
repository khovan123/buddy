import {
  JwtAuthGuard,
  PoliciesGuard,
  RequirePolicy,
  SubscriptionRequiredPolicy,
} from '@libs/common';
import { Body, Controller, Get, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { ServiceRegistryService } from '../../../infrastructure/config/service-registry.service';
import { proxyEventStream } from '../../../infrastructure/http/event-stream-proxy';
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
      query: req.user?.sub ? { viewerId: req.user.sub } : undefined,
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

  @Patch('topics/:topicId/view')
  viewTopic(@Param('topicId') topicId: string, @Req() req: AuthenticatedRequest) {
    return this.proxy.forward(req, {
      service: 'interaction',
      path: `/v1/forum/topics/${topicId}/view`,
      method: 'PATCH',
      body: {
        userId: req.user?.sub,
      },
    });
  }

  @Post('topics/:topicId/reactions')
  reactToTopic(
    @Param('topicId') topicId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    return this.proxy.forward(req, {
      service: 'interaction',
      path: `/v1/forum/topics/${topicId}/reactions`,
      method: 'POST',
      body: {
        ...body,
        userId: req.user?.sub,
      },
    });
  }

  @Get('topics/:topicId/messages')
  getTopicMessages(@Param('topicId') topicId: string, @Req() req: AuthenticatedRequest) {
    return this.proxy.forward(req, {
      service: 'interaction',
      path: `/v1/forum/topics/${topicId}/messages`,
      method: 'GET',
    });
  }

  @Post('topics/:topicId/messages')
  createReply(
    @Param('topicId') topicId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    return this.proxy.forward(req, {
      service: 'interaction',
      path: `/v1/forum/topics/${topicId}/messages`,
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
    return proxyEventStream(req, reply, { label: 'Forum', upstreamUrl });
  }

  private resolveAuthorName(user?: ForumUser): string | undefined {
    return user?.name ?? user?.nickname ?? user?.email;
  }
}
