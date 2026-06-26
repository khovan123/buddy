import { Nack, RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import {
  AppLogger,
  ensureCorrelationId,
  EXCHANGES,
  QUEUES,
  runWithCorrelationId,
} from '@libs/common';
import {
  ContentExtractionRpcResponseDto,
  PresignedUrlResult,
  PresignedUrlRpcResponse,
  PresignedUrlsRpcResponse,
  UPLOAD_ROUTINGKEYS,
  UploadType,
} from '@libs/contracts';
import { Injectable } from '@nestjs/common';
import { GetPreviewUrlHandler } from '../../../application/queries/handlers/get-preview-url.handler';
import { GetUploadHistoryByContentHandler } from '../../../application/queries/handlers/get-upload-history-by-content.handler';
import { GetUploadUrlHandler } from '../../../application/queries/handlers/get-upload-url.handler';
import { GetPreviewUrlQuery } from '../../../application/queries/get-preview-url.query';
import { GetUploadHistoryByContentQuery } from '../../../application/queries/get-upload-history-by-content.query';
import { GetUploadUrlQuery } from '../../../application/queries/get-upload-url.query';
import type { FileMetadataEntity } from '../../../domain/entities/file-metadata.entity';
import { ContentExtractionService } from '../../../domain/services/content-extraction.service';
import { VideoTranscriptService } from '../../../domain/services/video-transcript.service';
import {
  GetPresignedUrlRpcDto,
  GetPresignedUrlsRpcDto,
} from '../../../presentation/events/dtos/rpc-presigned-url.dto';
import {
  GetUploadHistoryByContentRpcDto,
  ReextractContentRpcDto,
} from '../../../presentation/events/dtos/rpc-upload-history.dto';
import { S3Service } from '../../persistence/aws/s3.service';

/** Controller handling incoming requests for UploadRpc. */
@Injectable()
export class UploadUrlConsumer {
  private readonly logger = new AppLogger(UploadUrlConsumer.name);

  constructor(
    private readonly getUploadUrlHandler: GetUploadUrlHandler,
    private readonly getUploadHistoryByContentHandler: GetUploadHistoryByContentHandler,
    private readonly getPreviewUrlHandler: GetPreviewUrlHandler,
    private readonly s3Service: S3Service,
    private readonly contentExtraction: ContentExtractionService,
    private readonly videoTranscript: VideoTranscriptService,
  ) {}

  /**
   * Handles a single presigned URL request from the content-service.
   *
   * @param data - Validated RPC envelope containing file metadata
   */
  @RabbitRPC({
    exchange: EXCHANGES.UPLOAD,
    routingKey: UPLOAD_ROUTINGKEYS.GET_PRESIGNED_URL,
    queue: QUEUES.UPLOAD_RPC_GET_PRESIGNED_URL,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async getPresignedUrl(data: GetPresignedUrlRpcDto): Promise<PresignedUrlRpcResponse | Nack> {
    const correlationId = ensureCorrelationId(data.correlationId, data.eventId);
    const { file, uploadType, uploadedBy, contentId, contentType } = data.payload;
    const { fileName, fileSizeBytes, mimeType } = file;
    const startedAt = Date.now();

    try {
      this.logger.log('Received upload presigned URL RPC', {
        correlationId,
        eventId: data.eventId,
        contentId,
        contentType,
        uploadType,
        fileName,
        fileSizeBytes,
      });
      const result: PresignedUrlResult = await runWithCorrelationId(correlationId, () =>
        this.getUploadUrlHandler.execute(
          new GetUploadUrlQuery(
            fileName,
            fileSizeBytes,
            mimeType,
            uploadType,
            uploadedBy,
            contentId,
            contentType,
            `docs/${data.payload.contentId}`,
          ),
        ),
      );
      this.logger.log('Completed upload presigned URL RPC', {
        correlationId,
        eventId: data.eventId,
        contentId,
        fileId: result.fileId,
        elapsedMs: Date.now() - startedAt,
      });
      return { contentId, uploadUrl: result };
    } catch (error) {
      this.logger.error(
        'Failed upload presigned URL RPC',
        error instanceof Error ? error.stack : String(error),
        {
          correlationId,
          eventId: data.eventId,
          contentId,
          elapsedMs: Date.now() - startedAt,
        },
      );
      return new Nack(false);
    }
  }

  /**
   * Handles a batch presigned URLs request from the content-service.
   *
   * @param data - Validated RPC envelope containing multiple file metadata entries
   */
  @RabbitRPC({
    exchange: EXCHANGES.UPLOAD,
    routingKey: UPLOAD_ROUTINGKEYS.GET_PRESIGNED_URLS,
    queue: QUEUES.UPLOAD_RPC_GET_PRESIGNED_URLS,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async getPresignedUrls(data: GetPresignedUrlsRpcDto): Promise<PresignedUrlsRpcResponse | Nack> {
    const correlationId = ensureCorrelationId(data.correlationId, data.eventId);
    const startedAt = Date.now();

    try {
      this.logger.log('Received batch upload presigned URLs RPC', {
        correlationId,
        eventId: data.eventId,
        contentId: data.payload.contentId,
        contentType: data.payload.contentType,
        fileCount: data.payload.files.length,
      });
      const result = await runWithCorrelationId(correlationId, async () => {
        const uploadUrls = await Promise.all(
          data.payload.files.map(async (file) => {
            const presigned: PresignedUrlResult = await this.getUploadUrlHandler.execute(
              new GetUploadUrlQuery(
                file.fileName,
                file.fileSizeBytes,
                file.mimeType,
                UploadType.RESOURCE,
                data.payload.uploadedBy,
                data.payload.contentId,
                data.payload.contentType,
                `docs/${data.payload.contentId}`,
              ),
            );

            return {
              ...presigned,
              fileName: file.fileName,
              fileSizeBytes: file.fileSizeBytes,
              mimeType: file.mimeType,
            };
          }),
        );

        return {
          contentId: data.payload.contentId,
          uploadUrls,
        };
      });
      this.logger.log('Completed batch upload presigned URLs RPC', {
        correlationId,
        eventId: data.eventId,
        contentId: data.payload.contentId,
        fileCount: result.uploadUrls.length,
        elapsedMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      this.logger.error(
        'Failed batch upload presigned URLs RPC',
        error instanceof Error ? error.stack : String(error),
        {
          correlationId,
          eventId: data.eventId,
          contentId: data.payload.contentId,
          fileCount: data.payload.files.length,
          elapsedMs: Date.now() - startedAt,
        },
      );
      return new Nack(false);
    }
  }

  /**
   * Handles a request to fetch upload history for a specific content item by its ID.
   *
   * @param data - RPC payload containing contentId
   */
  @RabbitRPC({
    exchange: EXCHANGES.UPLOAD,
    routingKey: UPLOAD_ROUTINGKEYS.GET_UPLOAD_HISTORY_BY_CONTENT,
    queue: QUEUES.UPLOAD_RPC_GET_UPLOAD_HISTORY_BY_CONTENT,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async getUploadHistoryByContent(data: GetUploadHistoryByContentRpcDto) {
    const correlationId = ensureCorrelationId(data.correlationId, data.eventId);

    try {
      return await runWithCorrelationId(correlationId, () =>
        this.getUploadHistoryByContentHandler.execute(
          new GetUploadHistoryByContentQuery(data.payload.contentId),
        ),
      );
    } catch {
      return new Nack(false);
    }
  }

  /**
   * Re-extracts files for a content item directly from S3.
   *
   * This is used by content-service manual moderation rechecks, where upload
   * history metadata alone is not enough to safely re-run moderation.
   */
  @RabbitRPC({
    exchange: EXCHANGES.UPLOAD,
    routingKey: UPLOAD_ROUTINGKEYS.REEXTRACT_CONTENT,
    queue: QUEUES.UPLOAD_RPC_REEXTRACT_CONTENT,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async reextractContent(
    data: ReextractContentRpcDto,
  ): Promise<ContentExtractionRpcResponseDto | Nack> {
    const correlationId = ensureCorrelationId(data.correlationId, data.eventId);
    const { contentId } = data.payload;
    const contentType = this.normalizeContentType(data.payload.contentType);
    const startedAt = Date.now();

    try {
      return await runWithCorrelationId(correlationId, async () => {
        const files = (await this.getUploadHistoryByContentHandler.execute(
          new GetUploadHistoryByContentQuery(contentId),
        )) as FileMetadataEntity[];

        const extractedFiles = await Promise.all(
          files.map(async (file) => {
            try {
              const extraction = file.mimeType.startsWith('video/')
                ? await this.videoTranscript.transcribe({
                    fileId: file.id,
                    s3Key: file.s3Key,
                    signedUrl: await this.s3Service.generatePresignedDownloadUrl(file.s3Key),
                    originalFilename: file.originalFilename,
                    mimeType: file.mimeType,
                    uploadedBy: file.uploadedBy,
                  })
                : await this.contentExtraction.extract(
                    await this.s3Service.getObjectBuffer(file.s3Key),
                    file.mimeType,
                    file.originalFilename,
                  );

              return {
                fileId: file.id,
                s3Key: file.s3Key,
                downloadUrl: file.downloadUrl,
                mimeType: file.mimeType,
                originalFilename: file.originalFilename,
                extractedText: extraction.text,
                extractionStatus: extraction.status,
                extractionError: extraction.error ?? null,
              };
            } catch (error) {
              const reason = error instanceof Error ? error.message : String(error);
              this.logger.warn(
                `Re-extraction failed for file ${file.id} (${file.originalFilename}): ${reason}`,
              );
              return {
                fileId: file.id,
                s3Key: file.s3Key,
                downloadUrl: file.downloadUrl,
                mimeType: file.mimeType,
                originalFilename: file.originalFilename,
                extractedText: null,
                extractionStatus: 'FAILED' as const,
                extractionError: reason,
              };
            }
          }),
        );

        this.logger.log('Completed content re-extraction RPC', {
          correlationId,
          eventId: data.eventId,
          contentId,
          contentType,
          fileCount: extractedFiles.length,
          elapsedMs: Date.now() - startedAt,
        });

        return {
          contentId,
          contentType,
          files: extractedFiles,
          extractedAt: new Date().toISOString(),
        };
      });
    } catch (error) {
      this.logger.error(
        'Failed content re-extraction RPC',
        error instanceof Error ? error.stack : String(error),
        {
          correlationId,
          eventId: data.eventId,
          contentId,
          elapsedMs: Date.now() - startedAt,
        },
      );
      return new Nack(false);
    }
  }

  /**
   * Handles a request to get a document preview URL.
   * Accepts s3Key directly — handler looks up MediaFile by s3Key.
   *
   * @param data - RPC payload containing s3Key
   */
  @RabbitRPC({
    exchange: EXCHANGES.UPLOAD,
    routingKey: UPLOAD_ROUTINGKEYS.GET_PREVIEW_URL,
    queue: QUEUES.UPLOAD_RPC_GET_PREVIEW_URL,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async getPreviewUrl(data: {
    correlationId?: string;
    eventId?: string;
    payload: { s3Key: string; fullAccess?: boolean };
  }) {
    const correlationId = ensureCorrelationId(data.correlationId, data.eventId);

    try {
      return await runWithCorrelationId(correlationId, () =>
        this.getPreviewUrlHandler.execute(
          new GetPreviewUrlQuery(data.payload.s3Key, data.payload.fullAccess ?? false),
        ),
      );
    } catch {
      return new Nack(false);
    }
  }

  private normalizeContentType(contentType?: string): 'RESOURCE' | 'TUTORIAL' {
    return contentType?.trim().toUpperCase() === 'TUTORIAL' ? 'TUTORIAL' : 'RESOURCE';
  }
}
