import { JwtAuthGuard } from '@libs/common';
import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { HttpProxyService } from '../../../infrastructure/http/http-proxy.service';

/** Controller handling incoming requests for notification settings. */
@Controller({ path: 'notifications', version: '1' })
@UseGuards(JwtAuthGuard)
export class NotificationProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

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
