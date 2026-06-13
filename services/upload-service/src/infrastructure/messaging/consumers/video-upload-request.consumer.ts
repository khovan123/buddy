import { AmqpConnection, Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import {
  AppLogger,
  CORRELATION_ID_HEADER,
  EXCHANGES,
  QUEUES,
  RABBITMQ_CONNECTION,
  ensureCorrelationId,
  runWithCorrelationId,
} from '@libs/common';
import { UPLOAD_ROUTINGKEYS, VideoUploadRequestEvent } from '@libs/contracts';
import { Injectable, Inject } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type { ConsumeMessage } from 'amqplib';
import { ProcessVideoCommand } from '../../../application/commands/process-video.command';

const MAX_RETRY = 3;

/** Represents the  video upload request consumer component. */
@Injectable()
export class VideoUploadRequestConsumer {
  private readonly logger = new AppLogger(VideoUploadRequestConsumer.name);

  constructor(
    private readonly commandBus: CommandBus,
    @Inject(RABBITMQ_CONNECTION)
    private readonly amqpConnection: AmqpConnection,
  ) {}

  /**
   * Executes the handle upload request operation.
   *
   * @param payload - The payload parameter
   * @param amqpMsg - The raw AMQP message
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.UPLOAD,
    routingKey: UPLOAD_ROUTINGKEYS.VIDEO_UPLOAD_REQUEST,
    queue: QUEUES.UPLOAD_VIDEO_COMMANDS,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleUploadRequest(
    payload: VideoUploadRequestEvent['payload'],
    amqpMsg: ConsumeMessage,
  ): Promise<void | Nack> {
    const headers = (amqpMsg.properties.headers || {}) as Record<string, unknown>;
    const currentRetry = Number(headers['x-retry-count'] || 0);
    const correlationId = ensureCorrelationId(
      headers[CORRELATION_ID_HEADER],
      amqpMsg.properties.correlationId,
      amqpMsg.properties.messageId,
      payload.fileId,
    );

    try {
      await runWithCorrelationId(correlationId, async () => {
        await this.commandBus.execute(
          new ProcessVideoCommand(
            payload.fileId,
            payload.s3Key,
            payload.mimeType,
            payload.uploadedBy,
          ),
        );
      });
    } catch (error) {
      if (currentRetry < MAX_RETRY) {
        const retryEvent = new VideoUploadRequestEvent(payload);

        this.amqpConnection.publish(
          EXCHANGES.UPLOAD,
          retryEvent.routingKey,
          { pattern: retryEvent.routingKey, data: payload },
          {
            persistent: true,
            correlationId,
            headers: {
              ...headers,
              [CORRELATION_ID_HEADER]: correlationId,
              'x-retry-count': currentRetry + 1,
            },
          },
        );
        this.logger.warn(
          `Retry ${retryEvent.routingKey} for file ${payload.fileId} (${currentRetry + 1}/${MAX_RETRY})`,
          String(error),
        );
        return; // ack original (retry is republished)
      }

      this.logger.error(
        `Discard ${UPLOAD_ROUTINGKEYS.VIDEO_UPLOAD_REQUEST} after max retry for file ${payload.fileId}`,
        String(error),
      );
      return new Nack(false); // → dead-letter exchange
    }
  }
}
