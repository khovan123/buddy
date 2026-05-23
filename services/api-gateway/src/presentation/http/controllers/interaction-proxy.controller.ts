import {
  JwtAuthGuard,
  PoliciesGuard,
  RequirePolicy,
  SubscriptionRequiredPolicy,
} from '@libs/common';
import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { HttpProxyService } from '../../../infrastructure/http/http-proxy.service';

/** Proxy controller forwarding requests to interaction-service (port 3008). */
@Controller({ path: 'interactions', version: '1' })
export class InteractionProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

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
  trackInteraction(@Req() req: FastifyRequest, @Body() body: Record<string, unknown>) {
    return this.proxy.forward(req, {
      service: 'interaction',
      path: '/v1/interactions',
      method: 'POST',
      body,
    });
  }
}
