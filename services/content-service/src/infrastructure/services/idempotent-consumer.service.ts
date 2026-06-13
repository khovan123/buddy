import { AppLogger, CORRELATION_ID_HEADER, ensureCorrelationId } from '@libs/common';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';

import { MongoService } from '../persistence/mongo/mongo.service';
import {
  ProcessedMessage,
  ProcessedMessageDocument,
  ProcessedMessageStatus,
} from '../persistence/mongo/schemas/processed-message.schema';

/**
 * Reusable idempotent consumer service.
 *
 * Provides:
 * - `isAlreadyProcessed()` — duplicate detection via correlationId + routingKey
 * - `runWithIdempotency()` — transactional idempotency guard with fallback
 * - `resolveCorrelationId()` — extract correlationId from RMQ message
 *
 * Used by all event consumers in content-service to prevent duplicate processing.
 */
@Injectable()
export class IdempotentConsumerService {
  private readonly logger = new AppLogger(IdempotentConsumerService.name);
  private readonly serviceName = 'content-service';

  constructor(
    @InjectModel(ProcessedMessage.name)
    private readonly processedMessageModel: Model<ProcessedMessageDocument>,
    private readonly mongoService: MongoService,
  ) {}

  /**
   * Resolve correlationId from a RabbitMQ message's properties and headers.
   */
  resolveCorrelationId(message: Record<string, unknown>, fallback?: string): string {
    const properties = (message.properties || {}) as Record<string, unknown>;
    const headers = (properties.headers || {}) as Record<string, unknown>;
    return ensureCorrelationId(
      properties.correlationId as string | undefined,
      headers[CORRELATION_ID_HEADER] as string | undefined,
      properties.messageId as string | undefined,
      fallback,
    );
  }

  /**
   * Check if a message with this correlationId + routingKey has already been processed.
   */
  async isAlreadyProcessed(correlationId: string, routingKey: string): Promise<boolean> {
    const existing = await this.processedMessageModel
      .findOne({
        correlationId,
        serviceName: this.serviceName,
        $or: [{ routingKey }, { eventName: routingKey }],
        status: ProcessedMessageStatus.PROCESSED,
      })
      .lean()
      .exec();

    return Boolean(existing);
  }

  /**
   * Run an action with transactional idempotency guard.
   *
   * 1. Upsert a ProcessedMessage record with PROCESSING status
   * 2. Execute the action within the transaction
   * 3. Mark as PROCESSED
   *
   * Falls back to non-transactional path if Mongo doesn't support transactions.
   */
  async runWithIdempotency(
    correlationId: string,
    routingKey: string,
    action: (session?: ClientSession) => Promise<void>,
  ): Promise<boolean> {
    const connection = this.mongoService.getConnection();
    const session = await connection.startSession();
    let processed = false;

    try {
      await session.withTransaction(async () => {
        const upsertResult = await this.processedMessageModel
          .updateOne(
            this.getIdempotencyKey(correlationId, routingKey),
            {
              $setOnInsert: {
                correlationId,
                routingKey,
                eventName: routingKey,
                serviceName: this.serviceName,
                status: ProcessedMessageStatus.PROCESSING,
              },
            },
            { upsert: true, session },
          )
          .exec();

        if (upsertResult.upsertedCount === 0) {
          const existing = await this.processedMessageModel
            .findOne(this.getIdempotencyKey(correlationId, routingKey), { status: 1 }, { session })
            .lean()
            .exec();

          if (existing?.status === ProcessedMessageStatus.PROCESSED) {
            return;
          }
        }

        await action(session);
        processed = true;

        await this.processedMessageModel
          .updateOne(
            this.getIdempotencyKey(correlationId, routingKey),
            {
              $set: {
                status: ProcessedMessageStatus.PROCESSED,
                processedAt: new Date(),
                expiresAt: new Date(),
              },
            },
            { session },
          )
          .exec();
      });
    } catch (error) {
      if (!this.isTransactionUnsupportedError(error)) {
        throw error;
      }

      this.logger.warn(
        'Mongo transaction is unavailable. Falling back to non-transactional idempotency path.',
      );
      return this.runWithoutTransaction(correlationId, routingKey, action);
    } finally {
      await session.endSession();
    }

    return processed;
  }

  private async runWithoutTransaction(
    correlationId: string,
    routingKey: string,
    action: (session?: ClientSession) => Promise<void>,
  ): Promise<boolean> {
    const upsertResult = await this.processedMessageModel
      .updateOne(
        this.getIdempotencyKey(correlationId, routingKey),
        {
          $setOnInsert: {
            correlationId,
            routingKey,
            eventName: routingKey,
            serviceName: this.serviceName,
            status: ProcessedMessageStatus.PROCESSING,
          },
        },
        { upsert: true },
      )
      .exec();

    if (upsertResult.upsertedCount === 0) {
      const existing = await this.processedMessageModel
        .findOne(this.getIdempotencyKey(correlationId, routingKey), { status: 1 })
        .lean()
        .exec();

      if (existing?.status === ProcessedMessageStatus.PROCESSED) {
        return false;
      }
    }

    await action(undefined);

    await this.processedMessageModel
      .updateOne(this.getIdempotencyKey(correlationId, routingKey), {
        $set: {
          status: ProcessedMessageStatus.PROCESSED,
          processedAt: new Date(),
          expiresAt: new Date(),
        },
      })
      .exec();

    return true;
  }

  private getIdempotencyKey(correlationId: string, routingKey: string): Record<string, string> {
    return {
      correlationId,
      eventName: routingKey,
      serviceName: this.serviceName,
    };
  }

  private isTransactionUnsupportedError(error: unknown): boolean {
    if (!error || !(error instanceof Error)) {
      return false;
    }

    return (
      error.message.includes('Transaction numbers are only allowed on a replica set member') ||
      error.message.includes('Transaction support is not available') ||
      error.message.includes('This MongoDB deployment does not support retryable writes')
    );
  }
}
