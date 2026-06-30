import { AppLogger, EXCHANGES, QUEUES } from '@libs/common';
import {
  ResourceUploadCompletedEvent,
  UPLOAD_ROUTINGKEYS,
  extractRmqPayload,
  type RmqMessagePayload,
} from '@libs/contracts';
import { Injectable, Inject } from '@nestjs/common';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';
import type { ConsumeMessage } from 'amqplib';

import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../../../domain/repositories/tokens';
import { IdempotentConsumerService } from '../../../infrastructure/services/idempotent-consumer.service';
import { ContentSettingsService } from '../../services/content-settings.service';
import { ContentModerationStatus } from '../../persistence/mongo/schemas/resource.schema';

/** Represents the  resource uploaded consumer component. */
@Injectable()
export class ResourceUploadedConsumer {
  private readonly logger = new AppLogger(ResourceUploadedConsumer.name);

  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,
    private readonly idempotentConsumer: IdempotentConsumerService,
    private readonly contentSettings: ContentSettingsService,
  ) {}

  /**
   * Executes the handle resource upload completed operation.
   *
   * @param messageData - The payload parameter
   * @param message - The ctx parameter
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.UPLOAD,
    routingKey: UPLOAD_ROUTINGKEYS.RESOURCE_UPLOAD_COMPLETED,
    queue: QUEUES.CONTENT_RESOURCE_UPLOAD_COMPLETED_EVENTS,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleResourceUploadCompleted(
    messageData: RmqMessagePayload<ResourceUploadCompletedEvent['payload']>,
    message: ConsumeMessage,
  ): Promise<void | Nack> {
    const payload = extractRmqPayload<ResourceUploadCompletedEvent['payload']>(messageData, [
      'resourceId',
      'meta',
    ]);
    const correlationId = this.idempotentConsumer.resolveCorrelationId(
      message as unknown as Record<string, unknown>,
      payload.resourceId,
    );

    try {
      if (!payload.resourceId || !Array.isArray(payload.meta)) {
        this.logger.error(
          `Missing resourceId or meta for ${UPLOAD_ROUTINGKEYS.RESOURCE_UPLOAD_COMPLETED}; skipping`,
        );
        return;
      }

      const processed = await this.idempotentConsumer.runWithIdempotency(
        correlationId,
        UPLOAD_ROUTINGKEYS.RESOURCE_UPLOAD_COMPLETED,
        async (session) => {
          await this.resourceRepository.completeUpload(
            payload.resourceId,
            payload.meta.map((item) => ({
              fileId: item.fileId,
              s3Key: item.s3Key,
              downloadUrl: item.downloadUrl,
              fileSize: item.size,
              extension: item.extension,
            })),
            { session },
          );

          if (!(await this.contentSettings.isModerationEnabled())) {
            await this.resourceRepository.applyModerationResult(
              payload.resourceId,
              {
                status: ContentModerationStatus.APPROVED,
                score: null,
                reasons: ['Content moderation disabled by admin setting.'],
                ruleVersion: 'runtime-moderation-disabled',
              },
              { session },
            );
          }
        },
      );

      if (processed === false) {
        this.logger.warn(
          `Skipped ${UPLOAD_ROUTINGKEYS.RESOURCE_UPLOAD_COMPLETED} for resourceId ${payload.resourceId}: already processed for correlationId=${correlationId}`,
        );
        return;
      }

      this.logger.log(
        `Successfully processed ${UPLOAD_ROUTINGKEYS.RESOURCE_UPLOAD_COMPLETED} for resourceId ${payload.resourceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process ${UPLOAD_ROUTINGKEYS.RESOURCE_UPLOAD_COMPLETED} for resourceId ${payload.resourceId}`,
        String(error),
      );
      return new Nack(false); // Send to DLX
    }
  }
}
