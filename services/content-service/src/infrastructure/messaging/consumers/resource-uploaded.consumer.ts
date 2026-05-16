import { AppLogger, EXCHANGES, QUEUES } from '@libs/common';
import {
  ResourceUploadCompletedEvent,
  UPLOAD_ROUTINGKEYS,
  extractRmqPayload,
  type RmqMessagePayload,
} from '@libs/contracts';
import { Controller, Inject } from '@nestjs/common';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';
import type { ConsumeMessage } from 'amqplib';

import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../../../domain/repositories/tokens';
import { IdempotentConsumerService } from '../../../infrastructure/services/idempotent-consumer.service';

/** Represents the  resource uploaded consumer component. */
@Controller()
export class ResourceUploadedConsumer {
  private readonly logger = new AppLogger(ResourceUploadedConsumer.name);

  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,
    private readonly idempotentConsumer: IdempotentConsumerService,
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
    queue: QUEUES.CONTENT_RESOURCE_EVENTS,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleResourceUploadCompleted(
    messageData: RmqMessagePayload<ResourceUploadCompletedEvent['payload']>,
    message: ConsumeMessage,
  ): Promise<void | Nack> {
    const payload = extractRmqPayload(messageData);
    const correlationId = this.idempotentConsumer.resolveCorrelationId(
      message as unknown as Record<string, unknown>,
      payload.resourceId,
    );

    try {
      await this.idempotentConsumer.runWithIdempotency(
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
        },
      );

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
