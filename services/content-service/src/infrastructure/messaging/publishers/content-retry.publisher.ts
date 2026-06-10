import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  AppLogger,
  CORRELATION_ID_HEADER,
  EXCHANGES,
  RABBITMQ_CONNECTION,
  RETRY_OPTIONS,
  mergeTraceContextIntoHeaders,
} from '@libs/common';
import { Inject, Injectable } from '@nestjs/common';

/**
 * Handles re-publishing failed messages back to the UPLOAD exchange with an
 * incremented `x-retry-count` header.
 *
 * Classic RabbitMQ queues do not track delivery count natively
 * (`x-delivery-count` is quorum-queue only, `x-death` is only present after
 * dead-lettering), so application-level retry counting via headers is the
 * reliable approach.  This mirrors the pattern used by
 * `NotificationEventPublisher` in the notification-service.
 */
@Injectable()
export class ContentRetryPublisher {
  private readonly logger = new AppLogger(ContentRetryPublisher.name);

  constructor(
    @Inject(RABBITMQ_CONNECTION)
    private readonly amqpConnection: AmqpConnection,
  ) {}

  /**
   * Re-publishes a failed message to the UPLOAD exchange with the same routing
   * key so the original subscriber picks it up again, now with an incremented
   * `x-retry-count`.
   */
  async republishForRetry(
    routingKey: string,
    data: unknown,
    retryCount: number,
    correlationId?: string,
  ): Promise<void> {
    this.amqpConnection.publish(EXCHANGES.UPLOAD, routingKey, data, {
      persistent: true,
      correlationId,
      headers: mergeTraceContextIntoHeaders({
        'x-retry-count': retryCount,
        'x-original-routing-key': routingKey,
        ...(correlationId ? { [CORRELATION_ID_HEADER]: correlationId } : {}),
      }),
    });

    this.logger.warn(
      `Message republished for retry #${retryCount} [${routingKey}] ` +
        `(max ${RETRY_OPTIONS.MAX_RETRIES})`,
    );
  }
}
