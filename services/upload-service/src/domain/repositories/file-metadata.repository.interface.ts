import { FileMetadataEntity, ProcessingStatus } from '../entities/file-metadata.entity';

export type CreateFileMetadataInput = {
  originalFilename: string;
  mimeType: string;
  s3Key: string; // Thay thế temporaryPath
  bucket: string; // Phân biệt 'tutorials' hay 'resources'
  fileSizeBytes: number; // Cần thiết để tính toán ETA
  uploadedBy: string;
  contentId: string;
  contentType: string;
};

export type FileMetadataListParams = {
  page: number;
  limit: number;
  status?: ProcessingStatus;
};

export type FileMetadataListResult = {
  data: FileMetadataEntity[];
  total: number;
};

/** Interface representing data constraints for  file metadata repository. */
export interface FileMetadataRepository {
  createPending(input: CreateFileMetadataInput): Promise<FileMetadataEntity>;
  markProcessingIfPending(id: string): Promise<boolean>;
  markProcessing(id: string): Promise<void>;

  // Update hỗ trợ cả video (streamingUrl, trailer) và tài liệu (downloadUrl)
  markCompleted(
    id: string,
    streamingUrl?: string | null,
    trailerUrl?: string | null,
    downloadUrl?: string | null,
  ): Promise<void>;

  markFailed(id: string, reason: string): Promise<void>;
  findById(id: string): Promise<FileMetadataEntity | null>;
  findByContentId(contentId: string): Promise<FileMetadataEntity[]>;
  findByContentIds(contentIds: string[]): Promise<FileMetadataEntity[]>;
  findByUserAndContentType(
    userId: string,
    contentType: string,
    limit?: number,
  ): Promise<FileMetadataEntity[]>;
  findByUploadedBy(
    uploadedBy: string,
    params: FileMetadataListParams,
  ): Promise<FileMetadataListResult>;
  updateStatus(id: string, status: ProcessingStatus): Promise<void>;
}
