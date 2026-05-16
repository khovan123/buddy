/**
 * ─── Preview DTOs & Enums ─────────────────────────────────────
 *
 * Centralized types for document preview communication
 * between Content-Service ↔ Upload-Service via Message Broker.
 *
 * ALL statuses use UPPER_CASE enum convention.
 */

// ─── Enums ────────────────────────────────────────────────────

/**
 * Preview generation status.
 *
 * Maps to the lifecycle of a preview file on S3:
 *   PROCESSING → AVAILABLE | FAILED | UNSUPPORTED
 */
export enum PreviewStatus {
  /** Preview file exists on S3 and is ready to serve */
  AVAILABLE = 'AVAILABLE',
  /** Preview is being generated (BullMQ worker in progress) */
  PROCESSING = 'PROCESSING',
  /** Preview generation failed (will retry on next request) */
  FAILED = 'FAILED',
  /** File format is not supported for preview generation */
  UNSUPPORTED = 'UNSUPPORTED',
}

/**
 * Media file processing status.
 *
 * Shared enum for the processing lifecycle of any uploaded media file.
 * Mirrors the Prisma `MediaProcessingStatus` enum in upload-service.
 */
export enum MediaProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  AVAILABLE = 'AVAILABLE',
  FAILED = 'FAILED',
}

// ─── RPC DTOs ─────────────────────────────────────────────────

/**
 * RPC Response: Upload-Service → Content-Service
 *
 * Returned by the `upload.get_preview_url` RPC handler when
 * Content-Service requests a preview URL for a specific fileId.
 */
export interface PreviewUrlRpcResponse {
  /** Signed URL to fetch the preview file — null if not yet available */
  previewUrl: string | null;
  /** Whether the preview is ready for display */
  isReady: boolean;
  /** Whether this response represents a partial preview (true) or full access (false) */
  isPreview: boolean;
  /** Percentage of content included in preview (e.g. 30) */
  previewPercentage: number;
  /** Explicit status for deterministic frontend state mapping */
  status: PreviewStatus;
}

/**
 * API Response: Content-Service → Frontend
 *
 * Extended response that wraps PreviewUrlRpcResponse with
 * resource-specific metadata for the frontend DocumentReader.
 */
export interface ResourcePreviewResponse {
  /** Signed URL to fetch the preview file — null if not yet available */
  previewUrl: string | null;
  /** Whether the preview is ready for display */
  isReady: boolean;
  /** Whether this is a partial preview or full access */
  isPreview: boolean;
  /** Percentage of content included in preview */
  previewPercentage: number;
  /** Explicit status for deterministic frontend state mapping */
  status: PreviewStatus;
  /** Resource title for display */
  resourceTitle: string;
  /** Resource slug for navigation/linking */
  resourceSlug: string;
  /** File format (e.g. 'PDF', 'DOCX') */
  format: string;
}
