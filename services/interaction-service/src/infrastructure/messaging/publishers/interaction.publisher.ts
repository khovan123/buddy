import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { AppLogger, EXCHANGES, RABBITMQ_CONNECTION } from '@libs/common';
import {
  INTERACTION_ROUTINGKEYS,
  InteractionPayload,
  InteractionTrackedEvent,
} from '@libs/contracts';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class InteractionPublisher {
  private readonly logger = new AppLogger(InteractionPublisher.name);

  constructor(
    @Inject(RABBITMQ_CONNECTION)
    private readonly amqpConnection: AmqpConnection,
  ) {}

  /** Publish interaction event to RabbitMQ for recommendation-service consumption. */
  async publish(payload: InteractionPayload): Promise<void> {
    try {
      const event = new InteractionTrackedEvent(payload);
      this.amqpConnection.publish(EXCHANGES.INTERACTION, INTERACTION_ROUTINGKEYS.TRACKED, {
        eventId: event.eventId,
        routingKey: event.routingKey,
        occurredAt: event.occurredAt,
        payload,
      });
    } catch (err) {
      // Non-blocking: event logging failure should never break the user flow
      this.logger.warn(
        `Failed to publish interaction event: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
