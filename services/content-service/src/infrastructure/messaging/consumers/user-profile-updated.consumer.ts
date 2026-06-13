import {
  AppLogger,
  CORRELATION_ID_HEADER,
  ensureCorrelationId,
  runWithCorrelationId,
  EXCHANGES,
  QUEUES,
} from '@libs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import type { ConsumeMessage } from 'amqplib';
import { USER_ROUTINGKEYS } from '@libs/contracts';
import { Injectable } from '@nestjs/common';
import { UserServicePublisher } from '../publishers/user-service.rpc';

interface UserProfileUpdatedPayload {
  payload?: {
    userId: string;
    changes?: Record<string, unknown>;
    updatedAt?: string;
  };
  correlationId?: string;
}

/**
 * Consumes `user.profile.updated` events published by the user-service.
 * Invalidates the local Redis cache so subsequent reads fetch fresh data via RPC.
 *
 * All cache operations are fail-safe — errors are logged but never propagated.
 */
@Injectable()
export class UserProfileUpdatedConsumer {
  private readonly logger = new AppLogger(UserProfileUpdatedConsumer.name);

  constructor(private readonly userServicePublisher: UserServicePublisher) {}

  @RabbitSubscribe({
    exchange: EXCHANGES.USER,
    routingKey: USER_ROUTINGKEYS.PROFILE_UPDATED,
    queue: QUEUES.CONTENT_USER_EVENTS,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async onProfileUpdated(
    data: UserProfileUpdatedPayload,
    originalMsg: ConsumeMessage,
  ): Promise<void> {
    const headers = (originalMsg.properties.headers || {}) as Record<string, unknown>;

    const correlationId = ensureCorrelationId(
      data?.correlationId,
      headers[CORRELATION_ID_HEADER],
      originalMsg.properties.correlationId,
      originalMsg.properties.messageId,
    );

    const userId = data?.payload?.userId;

    if (!userId) {
      this.logger.warn('Received profile updated event without userId, acking and skipping');
      return;
    }

    try {
      await runWithCorrelationId(correlationId, async () => {
        this.logger.log(`Invalidating cached profile for user ${userId}`, { correlationId });
        await this.userServicePublisher.invalidateCache(userId);
      });
    } catch (err) {
      // Even if invalidation fails, we ack — stale cache will expire via TTL
      this.logger.warn(
        `Cache invalidation failed for user ${userId}, will expire by TTL: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
