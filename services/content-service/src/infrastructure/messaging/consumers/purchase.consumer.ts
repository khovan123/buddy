import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { EXCHANGES, QUEUES } from '@libs/common';
import { BILLING_ROUTINGKEYS, PurchaseCompletedEvent } from '@libs/contracts';
import { Controller, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ConsumeMessage } from 'amqplib';
import { Model } from 'mongoose';
import { SavedContent } from '../../persistence/mongo/schemas/saved-content.schema';
import { IdempotentConsumerService } from '../../services/idempotent-consumer.service';

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
    event: PurchaseCompletedEvent,
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
        const { buyerId, items } = event.payload;

        const savedContentDocs = items.map((item) => ({
          userId: buyerId,
          itemId: item.itemId,
          itemType: item.itemType,
          metadata: {
            purchaseId: event.payload.purchaseId,
            amount: event.payload.amount,
          },
        }));

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
}
