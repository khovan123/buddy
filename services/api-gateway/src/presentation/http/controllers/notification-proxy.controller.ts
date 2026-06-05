import { JwtAuthGuard } from '@libs/common';
import {
  Body,
  Controller,
  Get,
  HttpException,
  Patch,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ServiceRegistryService } from '../../../infrastructure/config/service-registry.service';
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
      throw new HttpException('Notification stream unavailable', response.status);
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
