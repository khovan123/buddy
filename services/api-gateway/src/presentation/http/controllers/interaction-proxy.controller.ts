import {
  JwtAuthGuard,
  PoliciesGuard,
  RequirePolicy,
  SubscriptionRequiredPolicy,
} from '@libs/common';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ServiceRegistryService } from '../../../infrastructure/config/service-registry.service';
import { proxyEventStream } from '../../../infrastructure/http/event-stream-proxy';
import { HttpProxyService } from '../../../infrastructure/http/http-proxy.service';

type AuthenticatedRequest = FastifyRequest & { user?: { sub?: string } };

/** Proxy controller forwarding requests to interaction-service (port 3008). */
@Controller({ path: 'interactions', version: '1' })
export class InteractionProxyController {
  constructor(
    private readonly proxy: HttpProxyService,
    private readonly registry: ServiceRegistryService,
  ) {}

  /**
   * Executes the track interaction operation.
   *
   * @param req - The req parameter
   * @param body - The body parameter
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @RequirePolicy(SubscriptionRequiredPolicy)
  trackInteraction(@Req() req: AuthenticatedRequest, @Body() body: Record<string, unknown>) {
    return this.proxy.forward(req, {
      service: 'interaction',
      path: '/v1/interactions',
      method: 'POST',
      body: {
        ...body,
        userId: req.user?.sub,
      },
    });
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @RequirePolicy(SubscriptionRequiredPolicy)
  getInteractionStats(@Req() req: AuthenticatedRequest, @Query() query: Record<string, string>) {
    return this.proxy.forward(req, {
      service: 'interaction',
      path: '/v1/interactions/stats',
      method: 'GET',
      query: {
        ...query,
        userId: req.user?.sub ?? '',
      },
    });
  }

  @Get('stream')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @RequirePolicy(SubscriptionRequiredPolicy)
  async streamInteractions(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const upstreamUrl = `${this.registry.getUrl('interaction')}/v1/interactions/stream`;
    return proxyEventStream(req, reply, { label: 'Interaction', upstreamUrl });
  }
}
