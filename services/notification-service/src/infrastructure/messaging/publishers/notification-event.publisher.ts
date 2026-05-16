import {
  AppLogger,
  CORRELATION_ID_HEADER,
  EXCHANGES,
  RETRY_OPTIONS,
  mergeTraceContextIntoHeaders,
} from '@libs/common';
import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

/**
 * NotificationEventPublisher chỉ chịu trách nhiệm:
 * 1. Re-publish message thất bại sang retry exchange để consumer tự own queue/binding.
 *
 * Không dùng để publish event gốc — việc đó là của auth-service.
 */
@Injectable()
export class NotificationEventPublisher {
  private readonly logger = new AppLogger(NotificationEventPublisher.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  /**
   * Re-publishes a failed message to the retry exchange.
   *
   * The message keeps the same { pattern, data } shape so the consumer can
   * still match it after the delay queue expires.
   */
  async republishWithDelay(pattern: string, data: unknown, retryCount: number): Promise<void> {
    const message = { pattern, data };
    const correlationId =
      (data as { correlationId?: string } | undefined)?.correlationId ??
      (data as { data?: { correlationId?: string } } | undefined)?.data?.correlationId;

    try {
      this.amqpConnection.publish(EXCHANGES.NOTIFICATION, pattern, message, {
        persistent: true,
        correlationId,
        headers: mergeTraceContextIntoHeaders({
          'x-retry-count': retryCount,
          'x-original-pattern': pattern,
          ...(correlationId ? { [CORRELATION_ID_HEADER]: correlationId } : {}),
        }),
      });

      this.logger.warn(
        `Message published for retry #${retryCount} [${pattern}] (delay ${RETRY_OPTIONS.DELAY_MS}ms)`,
      );
    } catch (err) {
      this.logger.error(`Failed to re-publish message [${pattern}] to retry exchange`, String(err));
    }
  }
}
