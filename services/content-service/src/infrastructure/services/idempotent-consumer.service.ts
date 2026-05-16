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
        routingKey,
        serviceName: this.serviceName,
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
  ): Promise<void> {
    const connection = this.mongoService.getConnection();
    const session = await connection.startSession();

    try {
      await session.withTransaction(async () => {
        const upsertResult = await this.processedMessageModel
          .updateOne(
            {
              correlationId,
              routingKey,
              serviceName: this.serviceName,
            },
            {
              $setOnInsert: {
                correlationId,
                routingKey,
                serviceName: this.serviceName,
                status: ProcessedMessageStatus.PROCESSING,
              },
            },
            { upsert: true, session },
          )
          .exec();

        if (upsertResult.upsertedCount === 0) {
          const existing = await this.processedMessageModel
            .findOne(
              {
                correlationId,
                routingKey,
                serviceName: this.serviceName,
              },
              { status: 1 },
              { session },
            )
            .lean()
            .exec();

          if (existing?.status === ProcessedMessageStatus.PROCESSED) {
            return;
          }
        }

        await action(session);

        await this.processedMessageModel
          .updateOne(
            {
              correlationId,
              routingKey,
              serviceName: this.serviceName,
            },
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
      await this.runWithoutTransaction(correlationId, routingKey, action);
    } finally {
      await session.endSession();
    }
  }

  private async runWithoutTransaction(
    correlationId: string,
    routingKey: string,
    action: (session?: ClientSession) => Promise<void>,
  ): Promise<void> {
    await this.processedMessageModel
      .updateOne(
        {
          correlationId,
          routingKey,
          serviceName: this.serviceName,
        },
        {
          $setOnInsert: {
            correlationId,
            routingKey,
            serviceName: this.serviceName,
            status: ProcessedMessageStatus.PROCESSING,
          },
        },
        { upsert: true },
      )
      .exec();

    await action(undefined);

    await this.processedMessageModel
      .updateOne(
        {
          correlationId,
          routingKey,
          serviceName: this.serviceName,
        },
        {
          $set: {
            status: ProcessedMessageStatus.PROCESSED,
            processedAt: new Date(),
            expiresAt: new Date(),
          },
        },
      )
      .exec();
  }

  private isTransactionUnsupportedError(error: unknown): boolean {
    if (!error || !(error instanceof Error)) {
      return false;
    }

    return (
      error.message.includes('Transaction numbers are only allowed on a replica set member') ||
      error.message.includes('Transaction support is not available')
    );
  }
}
