import {
  AppLogger,
  CORRELATION_ID_HEADER,
  EXCHANGES,
  QUEUES,
  ensureCorrelationId,
  runWithCorrelationId,
} from '@libs/common';
import {
  extractRmqPayload,
  ThumbnailUploadFailedEvent,
  ThumbnailUploadedEvent,
  UPLOAD_ROUTINGKEYS,
  UploadThumbnailEvent,
  type RmqMessagePayload,
} from '@libs/contracts';
import { Controller } from '@nestjs/common';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';
import type { ConsumeMessage } from 'amqplib';
import { CloudinaryService } from '../../persistence/cloudinary/cloudinary.service';
import { UploadEventPublisher } from '../publishers/upload-event.publisher';

/**
 * Event consumer that handles async thumbnail image uploads to Cloudinary.
 * After processing, publishes a completion/failure event back for content-service.
 */
@Controller()
export class ThumbnailUploadConsumer {
  private readonly logger = new AppLogger(ThumbnailUploadConsumer.name);

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly uploadEventPublisher: UploadEventPublisher,
  ) {}

  @RabbitSubscribe({
    exchange: EXCHANGES.UPLOAD,
    routingKey: UPLOAD_ROUTINGKEYS.UPLOAD_THUMBNAIL,
    queue: QUEUES.UPLOAD_THUMBNAIL,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleThumbnailUpload(
    messageData: RmqMessagePayload<UploadThumbnailEvent['payload']>,
    amqpMsg: ConsumeMessage,
  ): Promise<void | Nack> {
    const headers = (amqpMsg.properties.headers || {}) as Record<string, unknown>;
    const correlationId = ensureCorrelationId(
      headers[CORRELATION_ID_HEADER],
      amqpMsg.properties.correlationId,
      amqpMsg.properties.messageId,
    );

    try {
      await runWithCorrelationId(correlationId, async () => {
        // ── 1. Extract & validate payload ──────────────────────────────
        const payload = extractRmqPayload(messageData);

        this.logger.log(
          `[handleThumbnailUpload] Received event: ` +
            `hasPayload=${!!payload}, ` +
            `contentId=${payload?.contentId ?? 'MISSING'}, ` +
            `contentType=${payload?.contentType ?? 'MISSING'}, ` +
            `folder=${payload?.folder ?? 'MISSING'}, ` +
            `publicId=${payload?.publicId ?? 'MISSING'}, ` +
            `imageBase64Type=${typeof payload?.imageBase64}, ` +
            `imageBase64Length=${typeof payload?.imageBase64 === 'string' ? payload.imageBase64.length : 'N/A'}`,
        );

        if (!payload) {
          this.logger.error(
            `[handleThumbnailUpload] Payload is null/undefined. Raw messageData keys: ${Object.keys(messageData || {})}`,
          );
          await this.publishFailure(correlationId, 'unknown', 'resource', 'Payload is missing');
          return;
        }

        if (!payload.imageBase64) {
          this.logger.error(
            `[handleThumbnailUpload] imageBase64 is missing. Payload keys: ${Object.keys(payload)}`,
          );
          await this.publishFailure(
            correlationId,
            payload.contentId ?? 'unknown',
            this.normalizeContentType(payload.contentType),
            'imageBase64 is required but was not provided',
          );
          return;
        }

        if (!payload.folder || !payload.publicId) {
          this.logger.error(
            `[handleThumbnailUpload] folder or publicId missing: folder=${payload.folder}, publicId=${payload.publicId}`,
          );
          await this.publishFailure(
            correlationId,
            payload.contentId ?? 'unknown',
            this.normalizeContentType(payload.contentType),
            'folder and publicId are required',
          );
          return;
        }

        if (!payload.contentId || !payload.contentType) {
          this.logger.error(`[handleThumbnailUpload] contentId or contentType missing`);
          await this.publishFailure(
            correlationId,
            payload.contentId ?? 'unknown',
            this.normalizeContentType(payload.contentType),
            'contentId and contentType are required',
          );
          return;
        }

        // ── 2. Sanitize base64 data ────────────────────────────────────
        let base64Data: string;
        if (typeof payload.imageBase64 === 'string') {
          base64Data = payload.imageBase64;
        } else if (
          typeof payload.imageBase64 === 'object' &&
          payload.imageBase64 !== null &&
          'data' in (payload.imageBase64 as Record<string, unknown>)
        ) {
          // RabbitMQ JSON-serialized Buffer: { type: "Buffer", data: number[] }
          const bufObj = payload.imageBase64 as unknown as { data: number[] };
          base64Data = Buffer.from(bufObj.data).toString('base64');
          this.logger.warn(
            `[handleThumbnailUpload] imageBase64 was a serialized Buffer object, converted to string (${base64Data.length} chars)`,
          );
        } else {
          this.logger.error(
            `[handleThumbnailUpload] imageBase64 has unexpected type: ${typeof payload.imageBase64}`,
          );
          await this.publishFailure(
            correlationId,
            payload.contentId,
            this.normalizeContentType(payload.contentType),
            `imageBase64 has unexpected type: ${typeof payload.imageBase64}`,
          );
          return;
        }

        // Strip data URI prefix if present
        if (base64Data.includes('base64,')) {
          base64Data = base64Data.split('base64,')[1];
        }

        if (!base64Data || base64Data.length === 0) {
          await this.publishFailure(
            correlationId,
            payload.contentId,
            this.normalizeContentType(payload.contentType),
            'imageBase64 is empty after sanitization',
          );
          return;
        }

        // ── 3. Convert to Buffer & upload ──────────────────────────────
        const imageBuffer = Buffer.from(base64Data, 'base64');

        this.logger.log(
          `[handleThumbnailUpload] Uploading to Cloudinary: ` +
            `folder=${payload.folder}, publicId=${payload.publicId}, ` +
            `bufferSize=${imageBuffer.length} bytes`,
        );

        const thumbnailUrl = await this.cloudinaryService.uploadThumbnail(
          imageBuffer,
          payload.folder,
          payload.publicId,
        );

        this.logger.log(`[handleThumbnailUpload] Upload success: ${thumbnailUrl}`);

        // ── 4. Publish completion event ────────────────────────────────
        const completionEvent = new ThumbnailUploadedEvent(
          {
            contentId: payload.contentId,
            contentType: this.normalizeContentType(payload.contentType),
            thumbnailUrl,
          },
          correlationId,
        );
        await this.uploadEventPublisher.publish(completionEvent);
        this.logger.log(
          `[handleThumbnailUpload] Published THUMBNAIL_UPLOADED for contentId=${payload.contentId}`,
        );
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[handleThumbnailUpload] Unexpected failure: ${errMsg}`);

      // Attempt to publish failure event
      try {
        const payload = extractRmqPayload(messageData);
        await this.publishFailure(
          correlationId,
          payload?.contentId ?? 'unknown',
          this.normalizeContentType(payload?.contentType),
          errMsg,
        );
      } catch (publishErr) {
        this.logger.error(`[handleThumbnailUpload] Failed to publish failure event: ${publishErr}`);
      }

      return new Nack(false); // → dead-letter exchange
    }
  }

  /**
   * Helper to publish a THUMBNAIL_UPLOAD_FAILED event.
   */
  private async publishFailure(
    correlationId: string,
    contentId: string,
    contentType: 'resource' | 'collection',
    reason: string,
  ): Promise<void> {
    const failureEvent = new ThumbnailUploadFailedEvent(
      { contentId, contentType, reason },
      correlationId,
    );
    await this.uploadEventPublisher.publish(failureEvent);
    this.logger.warn(
      `[handleThumbnailUpload] Published THUMBNAIL_UPLOAD_FAILED: contentId=${contentId}, reason=${reason}`,
    );
  }

  private normalizeContentType(contentType: unknown): 'resource' | 'collection' {
    return String(contentType).trim().toLowerCase() === 'collection' ? 'collection' : 'resource';
  }
}
