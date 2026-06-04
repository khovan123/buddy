import { OUTBOX_EVENTS } from '@libs/common';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { PrismaService } from '../../persistence/prisma/prisma.service';

/**
 * OutboxRelayService
 *
 * Implements the Transactional Outbox Pattern by:
 * 1. Listening for 'outbox.flush' events emitted after transaction commits
 * 2. Publishing each event to RabbitMQ using the shared AmqpConnection
 * 3. Marking the outbox record as PROCESSED on successful publication
 * 4. Managing retries and error handling gracefully
 *
 * This ensures guaranteed at-least-once event delivery across service boundaries.
 */
@Injectable()
export class OutboxRelayService implements OnModuleInit {
  private readonly logger = new Logger(OutboxRelayService.name);
  private isRunning = false;
  private static readonly OUTBOX_RELAY_LOCK_KEY = 903001;

  constructor(
    private readonly prisma: PrismaService,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  /** Flush any leftover PENDING events from before last shutdown/crash. */
  async onModuleInit(): Promise<void> {
    await this.relayPendingEvents();
  }

  /**
   * Triggered by outbox.flush event after a transaction commits.
   * Designed to be idempotent: failed messages are retried without duplication.
   */
  @OnEvent(OUTBOX_EVENTS.FLUSHED)
  async relayPendingEvents(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const [{ locked }] = await this.prisma.client.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_try_advisory_lock(${OutboxRelayService.OUTBOX_RELAY_LOCK_KEY}) AS locked
      `;

      if (!locked) {
        this.logger.warn('Skip outbox relay: advisory lock is held by another worker');
        return;
      }

      try {
        const pendingEvents = await this.prisma.client.outbox.findMany({
          where: { status: 'PENDING' },
          orderBy: { occurredAt: 'asc' },
          take: 100,
          select: {
            id: true,
            type: true,
            payload: true,
            exchange: true,
            routingKey: true,
            retryCount: true,
          },
        });

        if (pendingEvents.length === 0) {
          return; // No events to relay
        }

        this.logger.debug(`Found ${pendingEvents.length} pending outbox events to relay`);

        const processedIds: string[] = [];
        const failedUpdates: Array<{ id: string; retryCount: number }> = [];

        // Process each event individually with error isolation
        for (const event of pendingEvents) {
          try {
            // Validate payload structure
            if (!event.payload || typeof event.payload !== 'object') {
              this.logger.error(
                `Event ${event.id} has invalid payload (not an object), marking as FAILED`,
              );
              failedUpdates.push({ id: event.id, retryCount: 5 }); // Force FAILED
              continue;
            }

            // Publish to RabbitMQ via shared connection
            await this.amqpConnection.publish(event.exchange, event.routingKey, event.payload, {
              persistent: true,
              contentType: 'application/json',
              headers: {
                'x-outbox-id': event.id,
                'x-event-type': event.type,
              },
            });

            processedIds.push(event.id);
            this.logger.debug(
              `Event ${event.id} (type: ${event.type}) relayed successfully to ${event.exchange}/${event.routingKey}`,
            );
          } catch (error) {
            const errorMessage = (error as Error).message;
            this.logger.warn(
              `Failed to relay event ${event.id} (attempt ${event.retryCount + 1}): ${errorMessage}`,
            );
            failedUpdates.push({ id: event.id, retryCount: event.retryCount + 1 });
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
          const isFailed = f.retryCount >= 5;
          await this.prisma.client.outbox.update({
            where: { id: f.id },
            data: {
              retryCount: f.retryCount,
              status: isFailed ? 'FAILED' : 'PENDING',
              ...(isFailed ? { processedAt: new Date() } : {}),
            },
          });

          if (isFailed) {
            this.logger.error(`Event ${f.id} exceeded max retry attempts (5), marking as FAILED`);
          }
        }
      } finally {
        await this.prisma.client.$executeRaw`
          SELECT pg_advisory_unlock(${OutboxRelayService.OUTBOX_RELAY_LOCK_KEY})
        `;
      }
    } catch (error) {
      this.logger.error('Unexpected error in outbox relay', (error as Error).message);
    } finally {
      this.isRunning = false;
    }
  }
}
