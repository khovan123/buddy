import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { AppLogger, EXCHANGES, OtelTracingInterceptor, QUEUES } from '@libs/common';
import {
  AccessGrantFailedEvent,
  BILLING_ROUTINGKEYS,
  PurchaseCompletedEvent,
  extractRmqPayload,
  type RmqMessagePayload,
} from '@libs/contracts';
import { Controller, Inject, UseInterceptors } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { GrantAccessCommand } from '../../../application/commands/grant-access.command';
import type { ISagaPublisher } from '../../../domain/repositories/saga-publisher.interface';
import { COMPENSATION_PUBLISHER } from '../../../domain/repositories/tokens';

/** RabbitMQ consumer for purchase-completed events (access granting). */
@Controller()
@UseInterceptors(OtelTracingInterceptor)
export class AccessConsumer {
  private readonly logger = new AppLogger(AccessConsumer.name);

  constructor(
    private readonly commandBus: CommandBus,
    @Inject(COMPENSATION_PUBLISHER)
    private readonly compensationPublisher: ISagaPublisher,
  ) {}

  /**
   * Handle PURCHASE_COMPLETED event from billing-service.
   * On failure, emits AccessGrantFailedEvent to trigger wallet refund (Saga compensation).
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.BILLING,
    routingKey: BILLING_ROUTINGKEYS.PURCHASE_COMPLETED,
    queue: QUEUES.ACCESS_COMMANDS,
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
      await this.commandBus.execute(
        new GrantAccessCommand(payload.purchaseId, payload.buyerId, payload.items),
      );
      this.logger.log(`Granted access for purchase ${payload.purchaseId}`);
    } catch (error) {
      // ── Saga Compensation: emit AccessGrantFailedEvent instead of just nacking ──
      const payload = extractRmqPayload(message);
      try {
        const compensationEvent = new AccessGrantFailedEvent(
          {
            purchaseId: payload.purchaseId,
            buyerId: payload.buyerId,
            sellerId: payload.sellerId,
            amount: payload.amount,
            items: payload.items,
            reason: error instanceof Error ? error.message : String(error),
            failedAt: new Date().toISOString(),
          },
          payload.purchaseId, // correlationId
        );

        await this.compensationPublisher.publish(compensationEvent);
        this.logger.warn(
          `Emitted AccessGrantFailedEvent for purchase ${payload.purchaseId} — compensation will refund buyer`,
        );
      } catch (compensationError) {
        // If compensation event also fails, nack and requeue for retry
        this.logger.error(
          `Failed to emit compensation event for purchase ${payload.purchaseId}`,
          String(compensationError),
        );
        return new Nack(true); // requeue
      }

      this.logger.error('Failed to grant access for PURCHASE_COMPLETED event', String(error));
    }
  }
}
