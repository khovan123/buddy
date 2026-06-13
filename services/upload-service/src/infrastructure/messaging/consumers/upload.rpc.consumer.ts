import { Nack, RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { ensureCorrelationId, EXCHANGES, QUEUES, runWithCorrelationId } from '@libs/common';
import {
  PresignedUrlResult,
  PresignedUrlRpcResponse,
  PresignedUrlsRpcResponse,
  UPLOAD_ROUTINGKEYS,
  UploadType,
} from '@libs/contracts';
import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetPreviewUrlQuery } from '../../../application/queries/get-preview-url.query';
import { GetUploadHistoryByContentQuery } from '../../../application/queries/get-upload-history-by-content.query';
import { GetUploadUrlQuery } from '../../../application/queries/get-upload-url.query';
import {
  GetPresignedUrlRpcDto,
  GetPresignedUrlsRpcDto,
} from '../../../presentation/events/dtos/rpc-presigned-url.dto';
import { GetUploadHistoryByContentRpcDto } from '../../../presentation/events/dtos/rpc-upload-history.dto';

/** Controller handling incoming requests for UploadRpc. */
@Injectable()
export class UploadUrlConsumer {
  constructor(private readonly queryBus: QueryBus) {}

  /**
   * Handles a single presigned URL request from the content-service.
   *
   * @param data - Validated RPC envelope containing file metadata
   */
  @RabbitRPC({
    exchange: EXCHANGES.UPLOAD,
    routingKey: UPLOAD_ROUTINGKEYS.GET_PRESIGNED_URL,
    queue: QUEUES.UPLOAD_RPC,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async getPresignedUrl(data: GetPresignedUrlRpcDto): Promise<PresignedUrlRpcResponse | Nack> {
    const correlationId = ensureCorrelationId(data.correlationId, data.eventId);
    const { file, uploadType, uploadedBy, contentId, contentType } = data.payload;
    const { fileName, fileSizeBytes, mimeType } = file;

    try {
      const result: PresignedUrlResult = await runWithCorrelationId(correlationId, () =>
        this.queryBus.execute(
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
      return { contentId, uploadUrl: result };
    } catch {
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
    queue: QUEUES.UPLOAD_RPC,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async getPresignedUrls(data: GetPresignedUrlsRpcDto): Promise<PresignedUrlsRpcResponse | Nack> {
    const correlationId = ensureCorrelationId(data.correlationId, data.eventId);

    try {
      const result = await runWithCorrelationId(correlationId, async () => {
        const uploadUrls = await Promise.all(
          data.payload.files.map(async (file) => {
            const presigned: PresignedUrlResult = await this.queryBus.execute(
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
      return result;
    } catch {
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
    queue: QUEUES.UPLOAD_RPC,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async getUploadHistoryByContent(data: GetUploadHistoryByContentRpcDto) {
    const correlationId = ensureCorrelationId(data.correlationId, data.eventId);

    try {
      return await runWithCorrelationId(correlationId, () =>
        this.queryBus.execute(new GetUploadHistoryByContentQuery(data.payload.contentId)),
      );
    } catch {
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
    queue: QUEUES.UPLOAD_RPC,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async getPreviewUrl(data: {
    correlationId?: string;
    eventId?: string;
    payload: { s3Key: string };
  }) {
    const correlationId = ensureCorrelationId(data.correlationId, data.eventId);

    try {
      return await runWithCorrelationId(correlationId, () =>
        this.queryBus.execute(new GetPreviewUrlQuery(data.payload.s3Key)),
      );
    } catch {
      return new Nack(false);
    }
  }
}
