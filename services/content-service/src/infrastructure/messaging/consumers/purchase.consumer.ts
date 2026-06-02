import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { EXCHANGES, QUEUES } from '@libs/common';
import { BILLING_ROUTINGKEYS, PurchaseCompletedEvent } from '@libs/contracts';
import { Controller, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ConsumeMessage } from 'amqplib';
import { Model } from 'mongoose';
import { SavedContent } from '../../persistence/mongo/schemas/saved-content.schema';
import { IdempotentConsumerService } from '../../services/idempotent-consumer.service';

type PurchaseCompletedPayload = PurchaseCompletedEvent['payload'];
type PurchaseCompletedMessage =
  | PurchaseCompletedEvent
  | {
      correlationId?: string;
      payload?: PurchaseCompletedPayload;
    };

type SavedContentInput = {
  userId: string;
  itemId: string;
  itemType: string;
  metadata: {
    purchaseId: string;
    amount: string;
  };
};

@Controller()
export class PurchaseConsumer {
  private readonly logger = new Logger(PurchaseConsumer.name);

  constructor(
    @InjectModel(SavedContent.name)
    private readonly savedContentModel: Model<SavedContent>,
    private readonly idempotentConsumer: IdempotentConsumerService,
  ) {}

  @RabbitSubscribe({
    exchange: EXCHANGES.BILLING,
    routingKey: BILLING_ROUTINGKEYS.PURCHASE_COMPLETED,
    queue: QUEUES.CONTENT_COMMANDS,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handlePurchaseCompleted(
    event: PurchaseCompletedMessage,
    message: ConsumeMessage,
  ): Promise<void> {
    const correlationId = this.idempotentConsumer.resolveCorrelationId(
      message as unknown as Record<string, unknown>,
      event.correlationId,
    );

    this.logger.debug(`Received PURCHASE_COMPLETED event: ${correlationId}`);

    await this.idempotentConsumer.runWithIdempotency(
      correlationId,
      BILLING_ROUTINGKEYS.PURCHASE_COMPLETED,
      async (session) => {
        const payload = this.extractPayload(event);
        if (!payload?.buyerId || !Array.isArray(payload.items)) {
          this.logger.warn(`Skipping malformed PURCHASE_COMPLETED event: ${correlationId}`);
          return;
        }

        const { buyerId } = payload;

        const savedContentDocs = this.expandSavedContentDocs(buyerId, payload);

        if (savedContentDocs.length > 0) {
          await this.savedContentModel
            .insertMany(savedContentDocs, { ordered: false, session })
            .catch((err: any) => {
              if (err.code !== 11000) {
                this.logger.warn(`Some inserts failed, potentially duplicates: ${err.message}`);
              }
            });
        }

        this.logger.log(`Successfully processed PURCHASE_COMPLETED for buyer ${buyerId}`);
      },
    );
  }

  private extractPayload(event: PurchaseCompletedMessage): PurchaseCompletedPayload | undefined {
    return event.payload;
  }

  private expandSavedContentDocs(
    buyerId: string,
    payload: PurchaseCompletedPayload,
  ): SavedContentInput[] {
    const docs = new Map<string, SavedContentInput>();
    const add = (itemId: string | undefined, itemType: string) => {
      if (!itemId) {
        return;
      }

      docs.set(`${itemType}:${itemId}`, {
        userId: buyerId,
        itemId,
        itemType,
        metadata: {
          purchaseId: payload.purchaseId,
          amount: payload.amount,
        },
      });
    };

    for (const item of payload.items) {
      add(item.itemId, item.itemType);
      item.resourceIds?.forEach((resourceId) => add(resourceId, 'RESOURCE'));
      add(item.tutorialId, 'TUTORIAL');
      item.tutorialIds?.forEach((tutorialId) => add(tutorialId, 'TUTORIAL'));
    }

    return Array.from(docs.values());
  }
}
