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

/** Represents the  rabbit m q publisher component. */
@Injectable()
export class UserEventPublisher {
  private readonly logger = new AppLogger(UserEventPublisher.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  /**
   * Executes the publish operation.
   *
   * @param event - The event parameter
   */
  async publish(event: BaseEvent): Promise<void> {
    const routingKey = event.routingKey;
    const correlationId = event.correlationId ?? getCorrelationId() ?? event.eventId;
    const exchangeByPrefix: Record<string, string> = {
      auth: EXCHANGES.AUTH,
      user: EXCHANGES.USER,
      notification: EXCHANGES.NOTIFICATION,
      upload: EXCHANGES.UPLOAD,
    };
    const exchange = exchangeByPrefix[routingKey.split('.')[0]] ?? EXCHANGES.USER;
    const message = {
      eventId: event.eventId,
      routingKey: event.routingKey,
      version: event.version,
      occurredAt: event.occurredAt,
      correlationId,
      payload: event.payload,
    };

    this.amqpConnection.publish(exchange, routingKey, message, {
      persistent: true,
      contentType: 'application/json',
      messageId: event.eventId,
      correlationId,
      timestamp: Date.now(),
      headers: mergeTraceContextIntoHeaders({
        [CORRELATION_ID_HEADER]: correlationId,
      }),
    });
  }
}
