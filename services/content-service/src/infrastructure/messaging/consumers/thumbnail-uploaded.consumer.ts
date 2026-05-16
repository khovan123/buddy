import { AppLogger, EXCHANGES, QUEUES } from '@libs/common';
import {
  extractRmqPayload,
  ThumbnailUploadedEvent,
  ThumbnailUploadFailedEvent,
  UPLOAD_ROUTINGKEYS,
  type RmqMessagePayload,
} from '@libs/contracts';
import { Controller, Inject } from '@nestjs/common';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';
import type { ConsumeMessage } from 'amqplib';

import type { ICollectionRepository } from '../../../domain/repositories/collection.repository.interface';
import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { COLLECTION_REPOSITORY, RESOURCE_REPOSITORY } from '../../../domain/repositories/tokens';
import { IdempotentConsumerService } from '../../../infrastructure/services/idempotent-consumer.service';

/**
 * Consumer that handles async thumbnail upload completion events from upload-service.
 * Updates the thumbnailUrl field in the correct entity (resource or collection).
 *
 * Uses IdempotentConsumerService for duplicate detection and transactional safety.
 */
@Controller()
export class ThumbnailUploadedConsumer {
  private readonly logger = new AppLogger(ThumbnailUploadedConsumer.name);

  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: ICollectionRepository,
    private readonly idempotentConsumer: IdempotentConsumerService,
  ) {}

  /**
   * Handle successful thumbnail upload — update thumbnailUrl in DB.
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.UPLOAD,
    routingKey: UPLOAD_ROUTINGKEYS.THUMBNAIL_UPLOADED,
    queue: QUEUES.CONTENT_RESOURCE_EVENTS,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleThumbnailUploaded(
    messageData: RmqMessagePayload<ThumbnailUploadedEvent['payload']>,
    message: ConsumeMessage,
  ): Promise<void | Nack> {
    const payload = extractRmqPayload(messageData);
    const correlationId = this.idempotentConsumer.resolveCorrelationId(
      message as unknown as Record<string, unknown>,
      payload.contentId,
    );

    try {
      if (!payload.contentId || !payload.thumbnailUrl) {
        this.logger.error(`[handleThumbnailUploaded] Missing contentId or thumbnailUrl, skipping`);
        return;
      }

      this.logger.log(
        `Processing ${UPLOAD_ROUTINGKEYS.THUMBNAIL_UPLOADED}: contentId=${payload.contentId}, ` +
          `contentType=${payload.contentType}, thumbnailUrl=${payload.thumbnailUrl}`,
      );

      // ── Idempotent DB update ─────────────────────────────────────────
      await this.idempotentConsumer.runWithIdempotency(
        correlationId,
        UPLOAD_ROUTINGKEYS.THUMBNAIL_UPLOADED,
        async (_session) => {
          if (payload.contentType === 'resource') {
            const resource = await this.resourceRepository.findById(payload.contentId);
            if (resource) {
              resource.thumbnailUrl = payload.thumbnailUrl;
              await this.resourceRepository.update(resource);
              this.logger.log(`Updated resource ${payload.contentId} thumbnailUrl`);
            } else {
              this.logger.warn(
                `Resource ${payload.contentId} not found, skipping thumbnail update`,
              );
            }
          } else if (payload.contentType === 'collection') {
            const collection = await this.collectionRepository.findById(payload.contentId);
            if (collection) {
              collection.thumbnailUrl = payload.thumbnailUrl;
              await this.collectionRepository.update(collection);
              this.logger.log(`Updated collection ${payload.contentId} thumbnailUrl`);
            } else {
              this.logger.warn(
                `Collection ${payload.contentId} not found, skipping thumbnail update`,
              );
            }
          } else {
            this.logger.warn(`Unknown contentType: ${payload.contentType}`);
          }
        },
      );

      this.logger.log(
        `Successfully processed ${UPLOAD_ROUTINGKEYS.THUMBNAIL_UPLOADED} for contentId ${payload.contentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process ${UPLOAD_ROUTINGKEYS.THUMBNAIL_UPLOADED} for contentId ${payload.contentId}`,
        String(error),
      );
      return new Nack(false); // Send to DLX
    }
  }

  /**
   * Handle failed thumbnail upload — log the failure for observability.
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.UPLOAD,
    routingKey: UPLOAD_ROUTINGKEYS.THUMBNAIL_UPLOAD_FAILED,
    queue: QUEUES.CONTENT_RESOURCE_EVENTS,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleThumbnailUploadFailed(
    messageData: RmqMessagePayload<ThumbnailUploadFailedEvent['payload']>,
    _message: ConsumeMessage,
  ): Promise<void> {
    const payload = extractRmqPayload(messageData);

    this.logger.warn(
      `[handleThumbnailUploadFailed] Thumbnail upload failed for ` +
        `contentId=${payload.contentId}, contentType=${payload.contentType}, ` +
        `reason=${payload.reason}`,
    );
  }
}
