import { AppLogger, OUTBOX_EVENTS, RETRY_OPTIONS } from '@libs/common';
import { BaseEvent } from '@libs/contracts';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../persistence/prisma/prisma.service';
import { UploadEventPublisher } from '../publishers/upload-event.publisher';

/** Represents the  outbox relay event component. */
class OutboxRelayEvent extends BaseEvent {
  constructor(
    private readonly name: string,
    public readonly payload: unknown,
    correlationId?: string,
  ) {
    super(correlationId);
  }

  get routingKey(): string {
    return this.name;
  }
}

/** Service handling business logic for  outbox relay. */
@Injectable()
export class OutboxRelayService implements OnModuleInit {
  private readonly logger = new AppLogger(OutboxRelayService.name);
  private isRunning = false;
  private retryTimer: NodeJS.Timeout | null = null;
  private static readonly OUTBOX_RELAY_LOCK_KEY = 902001;
  private static readonly RETRY_DELAY_MS = 5_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: UploadEventPublisher,
  ) {}

  /** Flush any leftover PENDING events from before last shutdown/crash. */
  async onModuleInit(): Promise<void> {
    await this.relayPendingEvents();
  }

  /**
   * Triggered by OutboxService.notifyFlush() after a transaction commits.
   */
  @OnEvent(OUTBOX_EVENTS.FLUSHED)
  async relayPendingEvents(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Skip outbox relay tick: previous run is still in progress');
      this.scheduleRetry();
      return;
    }

    this.clearScheduledRetry();
    this.isRunning = true;

    const [{ locked }] = await this.prisma.client.$queryRaw<Array<{ locked: boolean }>>`
      SELECT pg_try_advisory_lock(${OutboxRelayService.OUTBOX_RELAY_LOCK_KEY}) AS locked
    `;

    if (!locked) {
      this.isRunning = false;
      this.logger.warn('Skip outbox relay tick: advisory lock is held by another worker');
      this.scheduleRetry();
      return;
    }

    try {
      const pendingEvents = await this.prisma.client.outbox.findMany({
        where: { status: 'PENDING' },
        orderBy: { occurredAt: 'asc' },
        take: 50,
        select: {
          id: true,
          routingKey: true,
          payload: true,
          correlationId: true,
          occurredAt: true,
          retryCount: true,
        },
      });

      if (pendingEvents.length === 0) return;

      const processedIds: string[] = [];
      const failedUpdates: Array<{ id: string; retryCount: number }> = [];
      let hasRetryableFailures = false;

      for (const item of pendingEvents) {
        try {
          const correlationId = item.correlationId || item.id;
          const event = new OutboxRelayEvent(item.routingKey, item.payload, correlationId);
          await this.publisher.publish(event, {
            correlationId,
            messageId: correlationId,
            timestamp: item.occurredAt.getTime(),
          });

          processedIds.push(item.id);
        } catch (error) {
          failedUpdates.push({ id: item.id, retryCount: item.retryCount + 1 });

          this.logger.error(
            `Outbox relay failed for event ${item.routingKey} (retry ${item.retryCount + 1}/${RETRY_OPTIONS.MAX_RETRIES})`,
            String(error),
          );
        }
      }

      // Batch update processed events in a single call
      if (processedIds.length > 0) {
        await this.prisma.client.outbox.updateMany({
          where: { id: { in: processedIds } },
          data: { status: 'PROCESSED', processedAt: new Date() },
        });
      }

      // Handle failures individually (usually few)
      for (const f of failedUpdates) {
        const failed = f.retryCount >= RETRY_OPTIONS.MAX_RETRIES;
        hasRetryableFailures ||= !failed;
        await this.prisma.client.outbox.update({
          where: { id: f.id },
          data: {
            retryCount: f.retryCount,
            status: failed ? 'FAILED' : 'PENDING',
          },
        });
      }

      if (pendingEvents.length === 50 || hasRetryableFailures) {
        this.scheduleRetry();
      }
    } finally {
      await this.prisma.client.$executeRaw`
        SELECT pg_advisory_unlock(${OutboxRelayService.OUTBOX_RELAY_LOCK_KEY})
      `;
      this.isRunning = false;
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimer) {
      return;
    }

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.relayPendingEvents();
    }, OutboxRelayService.RETRY_DELAY_MS);
  }

  private clearScheduledRetry(): void {
    if (!this.retryTimer) {
      return;
    }

    clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }
}
