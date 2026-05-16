import { ResourceQueryItem } from '../../../domain/repositories/resource.repository.interface';
import { TutorialQueryItem } from '../../../domain/repositories/tutorial.repository.interface';

export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'AVAILABLE' | 'FAILED';

export class ContentUploadHistoryItemDto {
  id!: string;
  originalFilename!: string;
  mimeType!: string;
  s3Key!: string;
  bucket!: string;
  fileSizeBytes!: number;
  uploadedBy!: string;
  status!: ProcessingStatus;
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

export class ResourceUploadHistoryResponseDto {
  resource!: ResourceQueryItem;
  uploadHistory!: ContentUploadHistoryItemDto[];
}

export class TutorialUploadHistoryResponseDto {
  tutorial!: TutorialQueryItem;
  uploadHistory!: ContentUploadHistoryItemDto[];
}
