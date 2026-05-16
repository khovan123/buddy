import { EXCHANGES, OUTBOX_EVENTS } from '@libs/common';
import { BaseEvent } from '@libs/contracts';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '../../persistence/prisma/generated/client';
import { TransactionClient } from '../../persistence/prisma/prisma.service';

/** Service handling business logic for  outbox. */
@Injectable()
export class OutboxService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Executes the put operation.
   *
   * @param event - The event parameter
   * @param transactionContext - The transactionContext parameter
   */
  async put(event: BaseEvent, transactionContext: TransactionClient): Promise<void> {
    await transactionContext.outbox.create({
      data: {
        correlationId: event.correlationId ?? event.eventId,
        payload: (event.payload ?? event) as Prisma.InputJsonValue,
        exchange: this.resolveExchange(event.routingKey),
        routingKey: event.routingKey,
        status: 'PENDING',
        occurredAt: event.occurredAt,
        retryCount: 0,
      },
    });
  }

  /**
   * Notify the relay that new outbox records are ready.
   * Call this AFTER the transaction that wrote outbox records has committed.
   */
  notifyFlush(): void {
    this.eventEmitter.emit(OUTBOX_EVENTS.FLUSHED);
  }

  /**
   * Executes the resolve exchange operation.
   *
   * @param routingKey - The routingKey parameter
   * @returns Result of type string
   */
  private resolveExchange(routingKey: string): string {
    if (routingKey.startsWith('upload.')) return EXCHANGES.UPLOAD;
    if (routingKey.startsWith('auth.')) return EXCHANGES.AUTH;
    if (routingKey.startsWith('user.')) return EXCHANGES.USER;
    if (routingKey.startsWith('notification.')) return EXCHANGES.NOTIFICATION;
    return EXCHANGES.UPLOAD;
  }
}
