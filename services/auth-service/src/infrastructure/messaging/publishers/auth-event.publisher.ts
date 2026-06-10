import { AmqpConnectionManager } from '@golevelup/nestjs-rabbitmq';
import {
  AppLogger,
  CORRELATION_ID_HEADER,
  EXCHANGES,
  getCorrelationId,
  mergeTraceContextIntoHeaders,
} from '@libs/common';
import { BaseEvent } from '@libs/contracts';
import { Injectable } from '@nestjs/common';

/** Represents the  rabbit m q publisher component. */
@Injectable()
export class AuthEventPublisher {
  private readonly logger = new AppLogger(AuthEventPublisher.name);

  constructor(private readonly amqpConnectionManager: AmqpConnectionManager) {}

  /**
   * Publish domain event lên auth.events exchange.
   *
   * Message được wrap theo format NestJS RMQ transport:
   *   { pattern: routingKey, data: { ...payload } }
   *
   * Nhờ vậy @RabbitSubscribe() ở consumer match đúng routing key.
   */
  async publish(event: BaseEvent): Promise<void> {
    const routingKey = event.routingKey; // e.g. "auth.user.registered"
    const correlationId = event.correlationId ?? getCorrelationId() ?? event.eventId;
    const connection = this.amqpConnectionManager.getConnection('default');
    if (!connection) {
      throw new Error('RabbitMQ default connection is not available');
    }
    const message = {
      pattern: routingKey,
      data: {
        eventId: event.eventId,
        routingKey: event.routingKey,
        version: event.version,
        occurredAt: event.occurredAt,
        correlationId,
        causationId: event.causationId,
        payload: event.payload,
      },
    };

    try {
      await connection.publish(EXCHANGES.AUTH, routingKey, message, {
        persistent: true,
        contentType: 'application/json',
        messageId: event.eventId,
        correlationId,
        timestamp: Date.now(),
        headers: mergeTraceContextIntoHeaders({
          [CORRELATION_ID_HEADER]: correlationId,
        }),
      });

      this.logger.log(`Published [${EXCHANGES.AUTH}] ${routingKey}`, {
        eventId: event.eventId,
        correlationId: message.data.correlationId,
      });
    } catch (err) {
      this.logger.error(
        `Failed to publish [${routingKey}]`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  /**
   * Executes the publish batch operation.
   *
   * @param events - The events parameter
   */
  async publishBatch(events: BaseEvent[]): Promise<void> {
    await Promise.all(events.map((e) => this.publish(e)));
  }
}
