import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { AppLogger, EXCHANGES, QUEUES } from '@libs/common';
import {
  BILLING_ROUTINGKEYS,
  InteractionAction,
  type InteractionContentType,
  type PurchasedItemType,
  type PurchaseCompletedEvent,
  extractRmqPayload,
  type RmqMessagePayload,
} from '@libs/contracts';
import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { TrackInteractionCommand } from '../../application/commands/track-interaction.command';

@Controller()
export class BillingPurchaseConsumer {
  private readonly logger = new AppLogger(BillingPurchaseConsumer.name);

  constructor(private readonly commandBus: CommandBus) {}

  @RabbitSubscribe({
    exchange: EXCHANGES.BILLING,
    routingKey: BILLING_ROUTINGKEYS.PURCHASE_COMPLETED,
    queue: QUEUES.INTERACTION_EVENTS,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handlePurchaseCompleted(
    message: RmqMessagePayload<PurchaseCompletedEvent['payload']>,
  ): Promise<void | Nack> {
    try {
      const payload = extractRmqPayload(message);

      if (!payload?.buyerId || !Array.isArray(payload.items)) {
        this.logger.warn(`Dropping malformed [${BILLING_ROUTINGKEYS.PURCHASE_COMPLETED}] event`);
        return new Nack(false);
      }

      await Promise.all(
        payload.items.flatMap((item) => {
          const normalizedType = this.normalizeItemType(item.itemType);
          if (!normalizedType || !item.itemId) {
            return [];
          }

          return [
            this.commandBus.execute(
              new TrackInteractionCommand(
                payload.buyerId,
                item.itemId,
                normalizedType,
                InteractionAction.PURCHASE,
              ),
            ),
          ];
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to consume [${BILLING_ROUTINGKEYS.PURCHASE_COMPLETED}]`,
        error instanceof Error ? error.message : String(error),
      );
      return new Nack(true);
    }
  }

  private normalizeItemType(itemType: PurchasedItemType): InteractionContentType | null {
    switch (itemType) {
      case 'RESOURCE':
        return 'RESOURCE';
      case 'TUTORIAL':
      case 'TUTORIAL_BUNDLE':
        return 'TUTORIAL';
      case 'RESOURCE_COLLECTION':
        return 'RESOURCE_COLLECTION';
      case 'TUTORIAL_COLLECTION':
      case 'TUTORIAL_BUNDLE_COLLECTION':
        return 'TUTORIAL_COLLECTION';
      default:
        return null;
    }
  }
}
