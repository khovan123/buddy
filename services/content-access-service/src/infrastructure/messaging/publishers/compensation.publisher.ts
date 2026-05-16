import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  AppLogger,
  CORRELATION_ID_HEADER,
  EXCHANGES,
  getCorrelationId,
  mergeTraceContextIntoHeaders,
} from '@libs/common';
import { BaseEvent } from '@libs/contracts';
import { Injectable } from '@nestjs/common';
import type { ISagaPublisher } from '../../../domain/repositories/saga-publisher.interface';

/**
 * RabbitMQ publisher for emitting saga compensation events.
 * Publishes to the BILLING exchange with saga.* routing keys.
 */
@Injectable()
export class CompensationPublisher implements ISagaPublisher {
  private readonly logger = new AppLogger(CompensationPublisher.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  async publish(event: BaseEvent): Promise<void> {
    const routingKey = event.routingKey;
    const correlationId = event.correlationId ?? getCorrelationId() ?? event.eventId;

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
      this.amqpConnection.publish(EXCHANGES.BILLING, routingKey, message, {
        persistent: true,
        contentType: 'application/json',
        messageId: event.eventId,
        correlationId,
        timestamp: Date.now(),
        headers: mergeTraceContextIntoHeaders({
          [CORRELATION_ID_HEADER]: correlationId,
        }),
      });

      this.logger.log(`Published compensation event [${routingKey}]`, {
        eventId: event.eventId,
        correlationId,
      });
    } catch (err) {
      this.logger.error(
        `Failed to publish compensation event [${routingKey}]`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }
}
