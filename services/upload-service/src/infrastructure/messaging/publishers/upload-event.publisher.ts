import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  AppLogger,
  CORRELATION_ID_HEADER,
  EXCHANGES,
  getCorrelationId,
  mergeTraceContextIntoHeaders,
  RABBITMQ_CONNECTION,
} from '@libs/common';
import { BaseEvent, FileProcessedEvent } from '@libs/contracts';
import { Inject, Injectable } from '@nestjs/common';

/** Represents the  upload event publisher component. */
@Injectable()
export class UploadEventPublisher {
  private readonly logger = new AppLogger(UploadEventPublisher.name);

  constructor(
    @Inject(RABBITMQ_CONNECTION)
    private readonly amqpConnection: AmqpConnection,
  ) {}

  /**
   * Executes the publish operation.
   *
   * @param event - The event parameter
   * @param metadata - The metadata parameter
   */
  async publish(
    event: BaseEvent,
    metadata?: {
      correlationId?: string;
      messageId?: string;
      timestamp?: number;
      headers?: Record<string, unknown>;
    },
  ): Promise<void> {
    const routingKey = event.routingKey;
    const correlationId =
      metadata?.correlationId ?? event.correlationId ?? getCorrelationId() ?? event.eventId;
    const message = {
      pattern: routingKey,
      data: {
        eventId: event.eventId,
        routingKey: event.routingKey,
        version: event.version,
        occurredAt: event.occurredAt,
        correlationId,
        causationId: event.causationId,
        payload: (event as { payload?: unknown }).payload ?? event,
      },
    };

    this.amqpConnection.publish(EXCHANGES.UPLOAD, routingKey, message, {
      persistent: true,
      contentType: 'application/json',
      messageId: metadata?.messageId ?? correlationId,
      correlationId,
      timestamp: metadata?.timestamp ?? Date.now(),
      headers: mergeTraceContextIntoHeaders({
        ...(metadata?.headers || {}),
        [CORRELATION_ID_HEADER]: correlationId,
      }),
    });

    this.logger.log(`Published [${EXCHANGES.UPLOAD}] ${routingKey}`, {
      eventId: event.eventId,
      correlationId: message.data.correlationId,
    });
  }

  /**
   * Executes the publish file processed operation.
   *
   * @param event - The event parameter
   */
  async publishFileProcessed(event: FileProcessedEvent): Promise<void> {
    await this.publish(event);
  }
}
