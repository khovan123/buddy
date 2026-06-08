import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { AppLogger, EXCHANGES } from '@libs/common';
import { INTERACTION_ROUTINGKEYS, type ForumMentionCreatedPayload } from '@libs/contracts';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ForumNotificationPublisher {
  private readonly logger = new AppLogger(ForumNotificationPublisher.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  async publishMention(payload: ForumMentionCreatedPayload): Promise<void> {
    try {
      await this.amqpConnection.publish(
        EXCHANGES.INTERACTION,
        INTERACTION_ROUTINGKEYS.FORUM_MENTION_CREATED,
        {
          payload,
          correlationId: payload.messageId,
        },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to publish forum mention: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
