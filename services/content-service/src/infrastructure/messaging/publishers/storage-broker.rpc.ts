import {
  AppLogger,
  EXCHANGES,
  attachTraceContextToMessage,
  ensureCorrelationId,
  getCorrelationId,
} from '@libs/common';
import {
  GetBatchUploadHistoryByContentEvent,
  GetPresignedUrlEvent,
  GetPresignedUrlsEvent,
  GetPreviewUrlEvent,
  GetUploadHistoryByContentEvent,
  PresignedUrlRpcResponse,
  PresignedUrlsRpcResponse,
  type PreviewUrlRpcResponse,
  UploadHistoryItemRpcResponseDto,
  UploadThumbnailEvent,
} from '@libs/contracts';
import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

/** Represents the  storage broker publisher component. */
@Injectable()
export class StorageBrokerPublisher {
  private readonly logger = new AppLogger(StorageBrokerPublisher.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  // Đổi kiểu tham số thành GetPresignedUrlEvent để tận dụng type-checking
  /**
   * Executes the get presigned url operation.
   *
   * @param event - The event parameter
   * @returns Result of type Promise<PresignedUrlResponse>
   */
  async getPresignedUrl(event: GetPresignedUrlEvent): Promise<PresignedUrlRpcResponse> {
    const routingKey = event.routingKey;
    const messageData = this.toMessageData(event);

    try {
      return await this.amqpConnection.request<PresignedUrlRpcResponse>({
        exchange: EXCHANGES.UPLOAD,
        routingKey,
        payload: messageData,
        timeout: 8000,
      });
    } catch (error) {
      this.logger.error(`RPC timeout or error [${routingKey}]`, String(error));
      throw error;
    }
  }

  /**
   * Executes the get presigned urls operation.
   *
   * @param event - The event parameter
   * @returns Result of type Promise<PresignedUrlsResponse>
   */
  async getPresignedUrls(event: GetPresignedUrlsEvent): Promise<PresignedUrlsRpcResponse> {
    const routingKey = event.routingKey;
    const messageData = this.toMessageData(event);

    try {
      return await this.amqpConnection.request<PresignedUrlsRpcResponse>({
        exchange: EXCHANGES.UPLOAD,
        routingKey,
        payload: messageData,
        timeout: 8000,
      });
    } catch (error) {
      this.logger.error(`RPC timeout or error [${routingKey}]`, String(error));
      throw error;
    }
  }

  /**
   * Fetches the upload history for a specific content item via RPC.
   *
   * @param event - The event parameter containing contentId
   * @returns List of upload history metadata
   */
  async getUploadHistoryByContent(
    event: GetUploadHistoryByContentEvent,
  ): Promise<UploadHistoryItemRpcResponseDto[]> {
    const routingKey = event.routingKey;
    const messageData = this.toMessageData(event);

    try {
      return await this.amqpConnection.request<UploadHistoryItemRpcResponseDto[]>({
        exchange: EXCHANGES.UPLOAD,
        routingKey,
        payload: messageData,
        timeout: 8000,
      });
    } catch (error) {
      this.logger.error(`RPC timeout or error [${routingKey}]`, String(error));
      throw error;
    }
  }

  /**
   * Emit a thumbnail upload event (fire-and-forget) to upload-service.
   * The upload-service will process the image and emit a completion event back.
   *
   * @param event - The UploadThumbnailEvent with base64 image data
   */
  async emitThumbnailUpload(event: UploadThumbnailEvent): Promise<void> {
    // ── Pre-send validation ─────────────────────────────────────────
    const { payload } = event;
    if (!payload?.imageBase64) {
      throw new Error('Cannot emit thumbnail event: imageBase64 is required');
    }

    const routingKey = event.routingKey;
    const messageData = this.toMessageData(event);

    try {
      this.amqpConnection.publish(EXCHANGES.UPLOAD, routingKey, messageData);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[emitThumbnailUpload] Failed to emit event: ${errMsg}`);
      throw error;
    }
  }

  /**
   * Request a document preview URL from the upload-service via RPC.
   * SECURITY: Only fileId is sent — upload-service looks up all metadata from DB.
   *
   * @param event - The GetPreviewUrlEvent with fileId only
   * @returns Preview URL response with signed URL or pending status
   */
  async getPreviewUrl(event: GetPreviewUrlEvent): Promise<PreviewUrlRpcResponse> {
    const routingKey = event.routingKey;
    const messageData = this.toMessageData(event);

    try {
      return await this.amqpConnection.request<PreviewUrlRpcResponse>({
        exchange: EXCHANGES.UPLOAD,
        routingKey,
        payload: messageData,
        timeout: 10000,
      });
    } catch (error) {
      this.logger.error(`RPC timeout or error [${routingKey}]`, String(error));
      throw error;
    }
  }

  /**
   * Executes the to message data operation.
   *
   * @param event - The event parameter
   */
  private toMessageData(
    event:
      | GetPresignedUrlEvent
      | GetPresignedUrlsEvent
      | GetUploadHistoryByContentEvent
      | GetBatchUploadHistoryByContentEvent
      | GetPreviewUrlEvent
      | UploadThumbnailEvent,
  ) {
    const correlationId = ensureCorrelationId(
      event.correlationId,
      getCorrelationId(),
      event.eventId,
    );

    return attachTraceContextToMessage({
      eventId: event.eventId,
      routingKey: event.routingKey,
      version: event.version,
      occurredAt: event.occurredAt,
      correlationId,
      causationId: event.causationId,
      payload: event.payload,
    });
  }
}
