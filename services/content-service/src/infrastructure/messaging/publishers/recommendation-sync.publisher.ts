import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { AppLogger, EXCHANGES, RABBITMQ_CONNECTION } from '@libs/common';
import type { RecommendationContentSyncPayload } from '@libs/contracts';
import { Inject, Injectable } from '@nestjs/common';

/**
 * Publishes catalog sync events to a **fanout exchange** so that
 * both the recommendation-service and the rag-service receive them
 * independently on their own queues.
 *
 * Fire-and-forget: failures are logged but never block the main flow.
 */
@Injectable()
export class RecommendationSyncPublisher {
  private readonly logger = new AppLogger(RecommendationSyncPublisher.name);

  constructor(
    @Inject(RABBITMQ_CONNECTION)
    private readonly amqpConnection: AmqpConnection,
  ) {}

  /** Publish a sync payload to the content.sync fanout exchange (fire-and-forget). */
  async send(payload: RecommendationContentSyncPayload): Promise<void> {
    try {
      await this.amqpConnection.channel.publish(
        EXCHANGES.CONTENT_SYNC,
        '', // fanout ignores routing key
        Buffer.from(JSON.stringify(payload)),
        { persistent: true, contentType: 'application/json' },
      );
    } catch (err) {
      // Non-blocking: sync failure should never break content CRUD
      this.logger.warn(
        `Failed to sync to content.sync exchange: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Publish a sync payload and propagate any broker error to the caller.
   *
   * Use this in backfill/bulk flows where the caller needs to track
   * publish failures accurately instead of assuming success.
   */
  async sendOrThrow(payload: RecommendationContentSyncPayload): Promise<void> {
    await this.amqpConnection.channel.publish(
      EXCHANGES.CONTENT_SYNC,
      '', // fanout ignores routing key
      Buffer.from(JSON.stringify(payload)),
      { persistent: true, contentType: 'application/json' },
    );
  }
}
