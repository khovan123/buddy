import { JwtAuthGuard } from '@libs/common';
import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { HttpProxyService } from '../../../infrastructure/http/http-proxy.service';

@Controller({ path: 'content-settings', version: '1' })
@UseGuards(JwtAuthGuard)
export class ContentSettingsProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Get('moderation')
  getModerationSettings(@Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/content-settings/moderation',
      method: 'GET',
    });
  }

  @Patch('moderation')
  updateModerationSettings(@Body() body: unknown, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/content-settings/moderation',
      method: 'PATCH',
      body,
    });
  }
}
