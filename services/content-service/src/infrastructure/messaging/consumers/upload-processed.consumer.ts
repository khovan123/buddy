import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { AppLogger, EXCHANGES, QUEUES } from '@libs/common';
import {
  FileProcessedEvent,
  FileProcessingFailedEvent,
  UPLOAD_ROUTINGKEYS,
  extractRmqPayload,
  type RmqMessagePayload,
} from '@libs/contracts';
import { Controller, Inject } from '@nestjs/common';
import type { ConsumeMessage } from 'amqplib';

import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY, TUTORIAL_REPOSITORY } from '../../../domain/repositories/tokens';
import type { ITutorialRepository } from '../../../domain/repositories/tutorial.repository.interface';
import { IdempotentConsumerService } from '../../../infrastructure/services/idempotent-consumer.service';

/**
 * UploadProcessedConsumer - RabbitMQ Consumer lắng nghe `file.processed` event từ upload-service.
 *
 * Workflow:
 * 1. Nhận `file.processed` event từ upload-service
 * 2. Tìm Tutorial/Resource dựa trên fileId
 * 3. Cập nhật meta data (streamingUrl, trailerUrl cho tutorial; downloadUrl cho resource)
 * 4. Chuyển status sang AVAILABLE
 * 5. Retry tối đa 3 lần nếu lỗi, sau đó discard
 */
@Controller()
export class UploadProcessedConsumer {
  private readonly logger = new AppLogger(UploadProcessedConsumer.name);

  constructor(
    @Inject(TUTORIAL_REPOSITORY)
    private readonly tutorialRepository: ITutorialRepository,
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,
    private readonly idempotentConsumer: IdempotentConsumerService,
  ) {}

  /**
   * Executes the handle file processed operation.
   *
   * @param messageData - The payload parameter
   * @param message - The message parameter
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.UPLOAD,
    routingKey: UPLOAD_ROUTINGKEYS.FILE_PROCESSED,
    queue: QUEUES.CONTENT_FILE_PROCESSED_EVENTS,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleFileProcessed(
    messageData: RmqMessagePayload<FileProcessedEvent['payload']>,
    message: ConsumeMessage,
  ): Promise<void | Nack> {
    const payload = extractRmqPayload(messageData);
    const correlationId = this.idempotentConsumer.resolveCorrelationId(
      message as unknown as Record<string, unknown>,
      payload.fileId,
    );

    try {
      this.logger.log(
        `Processing ${UPLOAD_ROUTINGKEYS.FILE_PROCESSED} for fileId: ${payload.fileId}`,
      );

      await this.idempotentConsumer.runWithIdempotency(
        correlationId,
        UPLOAD_ROUTINGKEYS.FILE_PROCESSED,
        async (session) => {
          await this.tutorialRepository.updateByFileId(
            payload.fileId,
            {
              streamingUrl: payload.streamingUrl || null,
              trailerUrl: payload.trailerUrl || null,
              fileSize: payload.fileSize,
            },
            { session },
          );
        },
      );

      this.logger.log(
        `Successfully processed ${UPLOAD_ROUTINGKEYS.FILE_PROCESSED} for fileId: ${payload.fileId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process ${UPLOAD_ROUTINGKEYS.FILE_PROCESSED} for fileId ${payload.fileId}`,
        String(error),
      );
      return new Nack(false);
    }
  }

  /**
   * Executes the handle file processing failed operation.
   *
   * @param messageData - The payload parameter
   * @param message - The message parameter
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.UPLOAD,
    routingKey: UPLOAD_ROUTINGKEYS.FILE_PROCESSING_FAILED,
    queue: QUEUES.CONTENT_FILE_PROCESSING_FAILED_EVENTS,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleFileProcessingFailed(
    messageData: RmqMessagePayload<FileProcessingFailedEvent['payload']>,
    message: ConsumeMessage,
  ): Promise<void | Nack> {
    const payload = extractRmqPayload(messageData);
    const correlationId = this.idempotentConsumer.resolveCorrelationId(
      message as unknown as Record<string, unknown>,
      payload.fileId,
    );

    try {
      this.logger.warn(
        `Processing ${UPLOAD_ROUTINGKEYS.FILE_PROCESSING_FAILED} for fileId: ${payload.fileId}, reason: ${payload.reason}`,
      );

      await this.idempotentConsumer.runWithIdempotency(
        correlationId,
        UPLOAD_ROUTINGKEYS.FILE_PROCESSING_FAILED,
        async (session) => {
          await this.tutorialRepository.markFailedByFileId(payload.fileId, { session });
        },
      );

      this.logger.log(
        `Successfully processed ${UPLOAD_ROUTINGKEYS.FILE_PROCESSING_FAILED} for fileId: ${payload.fileId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process ${UPLOAD_ROUTINGKEYS.FILE_PROCESSING_FAILED} for fileId ${payload.fileId}`,
        String(error),
      );
      return new Nack(false);
    }
  }
}
