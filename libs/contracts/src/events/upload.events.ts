import { MediaProcessingStatus } from '../dtos/preview';
import { GetPresignedUrlPayload, GetPresignedUrlsPayload } from '../dtos/upload';
import { BaseEvent } from './base.event';

// ─── Routing keys ─────────────────────────────────────────────────
export const UPLOAD_ROUTINGKEYS = {
  GET_PRESIGNED_URL: 'upload.get_presigned_url',
  GET_PRESIGNED_URLS: 'upload.get_presigned_urls',
  GET_UPLOAD_HISTORY_BY_CONTENT: 'upload.get_upload_history_by_content',
  GET_BATCH_UPLOAD_HISTORY_BY_CONTENT: 'upload.get_batch_upload_history_by_content',
  GET_RESOURCE_UPLOAD_HISTORY_BY_USER: 'upload.get_resource_upload_history_by_user',
  GET_TUTORIAL_UPLOAD_HISTORY_BY_USER: 'upload.get_tutorial_upload_history_by_user',
  VIDEO_PROCESSING_JOB: 'upload.tutorial.video.processing', // Dùng cho BullMQ
  FILE_PROCESSED: 'upload.file.processed', // Bắn ra khi transcode/upload S3 hoàn tất
  FILE_PROCESSING_FAILED: 'upload.file.processing_failed',
  RESOURCE_UPLOAD_COMPLETED: 'upload.resource.upload.completed',
  CONTENT_EXTRACTED: 'upload.content.extracted',
  VIDEO_UPLOAD_REQUEST: 'video.upload_request', // Thường dùng khi các service khác gửi request xử lý
  UPLOAD_THUMBNAIL: 'upload.upload_thumbnail', // Event: request thumbnail upload to Cloudinary
  THUMBNAIL_UPLOADED: 'upload.thumbnail.uploaded', // Event: thumbnail upload completed
  THUMBNAIL_UPLOAD_FAILED: 'upload.thumbnail.upload_failed', // Event: thumbnail upload failed
  GET_PREVIEW_URL: 'upload.get_preview_url', // RPC: get document preview signed URL
} as const;

// ─── Payloads ─────────────────────────────────────────────────────

/** Represents the  get presigned url event component. */
export class GetPresignedUrlEvent extends BaseEvent {
  get routingKey() {
    return UPLOAD_ROUTINGKEYS.GET_PRESIGNED_URL;
  }

  constructor(
    public readonly payload: GetPresignedUrlPayload,
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Represents the  get presigned urls event component. */
export class GetPresignedUrlsEvent extends BaseEvent {
  get routingKey() {
    return UPLOAD_ROUTINGKEYS.GET_PRESIGNED_URLS;
  }

  constructor(
    public readonly payload: GetPresignedUrlsPayload,
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Represents the get upload history by content event component. */
export class GetUploadHistoryByContentEvent extends BaseEvent {
  get routingKey() {
    return UPLOAD_ROUTINGKEYS.GET_UPLOAD_HISTORY_BY_CONTENT;
  }

  constructor(
    public readonly payload: {
      contentId: string;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Represents the get batch upload history by content event component. */
export class GetBatchUploadHistoryByContentEvent extends BaseEvent {
  get routingKey() {
    return UPLOAD_ROUTINGKEYS.GET_BATCH_UPLOAD_HISTORY_BY_CONTENT;
  }

  constructor(
    public readonly payload: {
      contentIds: string[];
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Represents the get resource upload history by user event component. */
export class GetResourceUploadHistoryByUserEvent extends BaseEvent {
  get routingKey() {
    return UPLOAD_ROUTINGKEYS.GET_RESOURCE_UPLOAD_HISTORY_BY_USER;
  }

  constructor(
    public readonly payload: {
      userId: string;
      limit?: number; // optionally limit recent uploads
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Represents the get tutorial upload history by user event component. */
export class GetTutorialUploadHistoryByUserEvent extends BaseEvent {
  get routingKey() {
    return UPLOAD_ROUTINGKEYS.GET_TUTORIAL_UPLOAD_HISTORY_BY_USER;
  }

  constructor(
    public readonly payload: {
      userId: string;
      limit?: number; // optionally limit recent uploads
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Represents the  video processing job event component. */
export class VideoProcessingJobEvent extends BaseEvent {
  get routingKey() {
    return UPLOAD_ROUTINGKEYS.VIDEO_PROCESSING_JOB;
  }

  constructor(
    public readonly payload: {
      fileId: string;
      s3Key: string; // 🚀 Thay thế temporaryPath
      originalFilename: string;
      mimeType: string;
      uploadedBy: string;
      // Đã xóa tutorialId vì MediaFile hoạt động độc lập
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Represents the  file processed event component. */
export class FileProcessedEvent extends BaseEvent {
  get routingKey() {
    return UPLOAD_ROUTINGKEYS.FILE_PROCESSED;
  }

  constructor(
    public readonly payload: {
      fileId: string;
      streamingUrl?: string | null;
      trailerUrl?: string | null;
      downloadUrl?: string | null; // 🚀 Hỗ trợ thêm cho Resource
      fileSize: number;
      uploadedBy: string;
      processedAt: string;
      extractedText?: string | null;
      extractionStatus?: 'AVAILABLE' | 'UNSUPPORTED' | 'FAILED';
      extractionError?: string | null;
      // Đã xóa tutorialId vì Consumer sẽ query updateByFileId
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Represents the  file processing failed event component. */
export class FileProcessingFailedEvent extends BaseEvent {
  get routingKey() {
    return UPLOAD_ROUTINGKEYS.FILE_PROCESSING_FAILED;
  }

  constructor(
    public readonly payload: {
      fileId: string;
      reason: string;
      uploadedBy: string;
      failedAt: string;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Represents the  video upload request event component. */
export class VideoUploadRequestEvent extends BaseEvent {
  get routingKey() {
    return UPLOAD_ROUTINGKEYS.VIDEO_UPLOAD_REQUEST;
  }

  constructor(
    public readonly payload: {
      fileId: string; // 🚀 Dùng fileId để định danh thay vì tutorialId
      s3Key: string; // 🚀 Thay thế temporaryPath
      originalFilename: string;
      mimeType: string;
      uploadedBy: string;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Represents the  resource upload completed event component. */
export class ResourceUploadCompletedEvent extends BaseEvent {
  get routingKey() {
    return UPLOAD_ROUTINGKEYS.RESOURCE_UPLOAD_COMPLETED;
  }

  constructor(
    public readonly payload: {
      resourceId: string;
      uploadedBy: string;
      meta: Array<{
        fileId: string;
        s3Key: string;
        downloadUrl: string;
        size: number;
        extension: string;
        mimeType?: string;
        originalFilename?: string;
        extractedText?: string | null;
        extractionStatus?: 'AVAILABLE' | 'UNSUPPORTED' | 'FAILED';
        extractionError?: string | null;
      }>;
      completedAt: string;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Represents extracted upload content ready for moderation. */
export class ContentExtractedEvent extends BaseEvent {
  get routingKey() {
    return UPLOAD_ROUTINGKEYS.CONTENT_EXTRACTED;
  }

  constructor(
    public readonly payload: {
      contentId: string;
      contentType: 'RESOURCE' | 'TUTORIAL';
      files: Array<{
        fileId: string;
        s3Key: string;
        downloadUrl?: string | null;
        mimeType: string;
        originalFilename: string;
        extractedText?: string | null;
        extractionStatus: 'AVAILABLE' | 'UNSUPPORTED' | 'FAILED';
        extractionError?: string | null;
      }>;
      extractedAt: string;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

// ─── RPC Responses ────────────────────────────────────────────────
export class UploadHistoryItemRpcResponseDto {
  id!: string;
  originalFilename!: string;
  mimeType!: string;
  s3Key!: string;
  bucket!: string;
  fileSizeBytes!: number;
  uploadedBy!: string;
  status!: MediaProcessingStatus;
  contentId!: string | null;
  contentType!: string | null;
  streamingUrl!: string | null;
  trailerUrl!: string | null;
  downloadUrl!: string | null;
  processingError!: string | null;
  deletedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ResourceUploadHistoryRpcResponseDto extends UploadHistoryItemRpcResponseDto {}
export class TutorialUploadHistoryRpcResponseDto extends UploadHistoryItemRpcResponseDto {}

// ─── Thumbnail Upload (Event-Driven) ──────────────────────────────

/** Event to request an async thumbnail image upload to Cloudinary. */
export class UploadThumbnailEvent extends BaseEvent {
  get routingKey() {
    return UPLOAD_ROUTINGKEYS.UPLOAD_THUMBNAIL;
  }

  constructor(
    public readonly payload: {
      /** Base64-encoded image data */
      imageBase64: string;
      /** Cloudinary folder (e.g. 'thumbnails/resources') */
      folder: string;
      /** Cloudinary public ID (unique identifier for the image) */
      publicId: string;
      /** ID of the resource/collection that owns this thumbnail */
      contentId: string;
      /** Type of the owning entity */
      contentType: 'resource' | 'collection';
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Event emitted by upload-service when thumbnail upload succeeds. */
export class ThumbnailUploadedEvent extends BaseEvent {
  get routingKey() {
    return UPLOAD_ROUTINGKEYS.THUMBNAIL_UPLOADED;
  }

  constructor(
    public readonly payload: {
      contentId: string;
      contentType: 'resource' | 'collection';
      thumbnailUrl: string;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Event emitted by upload-service when thumbnail upload fails. */
export class ThumbnailUploadFailedEvent extends BaseEvent {
  get routingKey() {
    return UPLOAD_ROUTINGKEYS.THUMBNAIL_UPLOAD_FAILED;
  }

  constructor(
    public readonly payload: {
      contentId: string;
      contentType: 'resource' | 'collection';
      reason: string;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

// ─── Document Preview (RPC) ───────────────────────────────────────

/** Event to request a document preview URL via RPC. */
export class GetPreviewUrlEvent extends BaseEvent {
  get routingKey() {
    return UPLOAD_ROUTINGKEYS.GET_PREVIEW_URL;
  }

  constructor(
    public readonly payload: {
      /** The MediaFile S3 key for direct preview lookup */
      s3Key: string;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

// ─── Document Preview DTOs ────────────────────────────────────
// Preview types (PreviewStatus, PreviewUrlRpcResponse, ResourcePreviewResponse)
// are centralized in @libs/contracts/src/dtos/preview/index.ts
// Import them via: import { PreviewStatus, PreviewUrlRpcResponse } from '@libs/contracts';
