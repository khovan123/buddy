import { EXCHANGES, OUTBOX_EVENTS, RETRY_OPTIONS } from '@libs/common';
import { BaseEvent } from '@libs/contracts';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '../../persistence/prisma/generated/client';
import { PrismaService, TransactionClient } from '../../persistence/prisma/prisma.service';

/** Service handling business logic for  outbox. */
@Injectable()
export class OutboxService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

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
   * Compensate outbox rows when a post-commit operation fails.
   *
   * Marks all PENDING rows matching the given correlationId + routingKey
   * as FAILED so the relay does not publish events whose downstream
   * scheduling (e.g. extraction queue) never completed.
   *
   * Sets retryCount to MAX_RETRIES and processedAt to now() so the
   * OutboxCleanupService can garbage-collect these rows on its next run.
   */
  async compensate(correlationId: string, routingKey: string): Promise<number> {
    const result = await this.prisma.client.outbox.updateMany({
      where: {
        correlationId,
        routingKey,
        status: 'PENDING',
      },
      data: {
        status: 'FAILED',
        retryCount: RETRY_OPTIONS.MAX_RETRIES,
        processedAt: new Date(),
      },
    });
    return result.count;
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
