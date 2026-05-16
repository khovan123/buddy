// Chuẩn hóa Enum thành Uppercase để khớp với logic check trong Handler
// Đổi 'completed' thành 'AVAILABLE' cho khớp với logic ở Consumer
export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'AVAILABLE' | 'FAILED';

/** Domain Entity/Aggregate representing  file metadata. */
export class FileMetadataEntity {
  id!: string;
  originalFilename!: string;
  mimeType!: string;

  // ─── Cloud Storage Fields ─────────────────────────────────────────
  s3Key!: string; // Thay thế temporaryPath, lưu Object Key trên S3 (vd: tutorials/bai1.mp4)
  bucket!: string; // 'tutorials' hoặc 'resources'
  fileSizeBytes!: number; // Bắt buộc phải có để tính ETA và kiểm soát dung lượng

  // ─── Tracking & Status ──────────────────────────────────────────
  uploadedBy!: string;
  status!: ProcessingStatus;
  // ─── Content Linkage ──────────────────────────────────────────
  contentId: string | null = null;
  contentType: string | null = null; // 'resource' | 'tutorial'

  // ─── Result URLs ────────────────────────────────────────────────
  streamingUrl: string | null = null; // Dành cho HLS video (.m3u8)
  trailerUrl: string | null = null; // Dành cho Video trailer 15s (Cloudinary)
  downloadUrl: string | null = null; // Dành cho Resource (PDF, Docx) để tải trực tiếp

  // ─── Audit & Error Handling ─────────────────────────────────────
  processingError: string | null = null;
  deletedAt: Date | null = null; // Hỗ trợ Soft Delete theo chuẩn
  createdAt!: Date;
  updatedAt!: Date;
}
