import { JwtAuthGuard } from '@libs/common';
import { successResponse } from '@libs/contracts';
import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  Req,
  Sse,
  UseGuards,
  type MessageEvent,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { NotificationStreamService } from '../../../application/notifications/notification-stream.service';
import { GetNotificationsQuery } from '../../../application/queries/get-notifications.query';

type AuthenticatedRequest = FastifyRequest & { user: { sub: string } };

/** Controller handling the authenticated user's notifications. */
@Controller({ path: 'notifications', version: '1' })
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly notificationStream: NotificationStreamService,
  ) {}

  @Get()
  async getNotifications(
    @Req() req: AuthenticatedRequest,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const notifications = await this.queryBus.execute(
      new GetNotificationsQuery(req.user.sub, limit),
    );

    return successResponse(notifications);
  }

  @Sse('stream')
  streamNotifications(@Req() req: AuthenticatedRequest): Observable<MessageEvent> {
    return this.notificationStream.subscribe(req.user.sub);
  }
}
