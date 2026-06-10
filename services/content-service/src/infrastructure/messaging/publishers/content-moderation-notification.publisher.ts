import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  AppLogger,
  EXCHANGES,
  RABBITMQ_CONNECTION,
  attachTraceContextToMessage,
  ensureCorrelationId,
  getCorrelationId,
} from '@libs/common';
import type { ContentModerationCompletedEvent } from '@libs/contracts';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class ContentModerationNotificationPublisher {
  private readonly logger = new AppLogger(ContentModerationNotificationPublisher.name);

  constructor(
    @Inject(RABBITMQ_CONNECTION)
    private readonly amqpConnection: AmqpConnection,
  ) {}

  async send(event: ContentModerationCompletedEvent): Promise<void> {
    const correlationId = ensureCorrelationId(
      event.correlationId,
      getCorrelationId(),
      event.eventId,
    );
    const messageData = attachTraceContextToMessage({
      eventId: event.eventId,
      routingKey: event.routingKey,
      version: event.version,
      occurredAt: event.occurredAt,
      correlationId,
      causationId: event.causationId,
      payload: event.payload,
    });

    try {
      await this.amqpConnection.publish(EXCHANGES.CONTENT, event.routingKey, messageData);
      this.logger.log(
        `Published ${event.routingKey} for ${event.payload.contentType} ${event.payload.contentId}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to publish ${event.routingKey} for ${event.payload.contentType} ${event.payload.contentId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
