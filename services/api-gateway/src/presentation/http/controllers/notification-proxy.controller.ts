import { JwtAuthGuard } from '@libs/common';
import { Body, Controller, Get, Patch, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ServiceRegistryService } from '../../../infrastructure/config/service-registry.service';
import { proxyEventStream } from '../../../infrastructure/http/event-stream-proxy';
import { HttpProxyService } from '../../../infrastructure/http/http-proxy.service';

/** Controller handling incoming requests for notification settings. */
@Controller({ path: 'notifications', version: '1' })
@UseGuards(JwtAuthGuard)
export class NotificationProxyController {
  constructor(
    private readonly proxy: HttpProxyService,
    private readonly registry: ServiceRegistryService,
  ) {}

  @Get()
  getNotifications(@Req() req: FastifyRequest, @Query() query: Record<string, string>) {
    return this.proxy.forward(req, {
      service: 'notification',
      path: '/v1/notifications',
      method: 'GET',
      query,
    });
  }

  @Patch('read-all')
  markAllRead(@Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'notification',
      path: '/v1/notifications/read-all',
      method: 'PATCH',
    });
  }

  @Get('stream')
  async streamNotifications(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const upstreamUrl = `${this.registry.getUrl('notification')}/v1/notifications/stream`;
    return proxyEventStream(req, reply, { label: 'Notification', upstreamUrl });
  }

  @Get('preferences')
  getPreferences(@Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'notification',
      path: '/v1/notifications/preferences',
      method: 'GET',
    });
  }

  @Patch('preferences')
  updatePreferences(@Body() body: unknown, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'notification',
      path: '/v1/notifications/preferences',
      method: 'PATCH',
      body,
    });
  }
}
