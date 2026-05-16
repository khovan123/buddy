import { AppLogger, QUEUES } from '@libs/common';
import type { RecommendationContentSyncPayload } from '@libs/contracts';
import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

/**
 * Publishes catalog sync events to the recommendation-service
 * via the `recommendation.content.sync` queue.
 *
 * Fire-and-forget: failures are logged but never block the main flow.
 */
@Injectable()
export class RecommendationSyncPublisher {
  private readonly logger = new AppLogger(RecommendationSyncPublisher.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  /** Send a sync payload to recommendation.content.sync queue. */
  async send(payload: RecommendationContentSyncPayload): Promise<void> {
    try {
      await this.amqpConnection.channel.sendToQueue(
        QUEUES.RECOMMENDATION_CONTENT_SYNC,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true, contentType: 'application/json' },
      );
    } catch (err) {
      // Non-blocking: sync failure should never break content CRUD
      this.logger.warn(
        `Failed to sync to recommendation: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
