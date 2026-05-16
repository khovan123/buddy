import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { FileMetadataRepository } from '../../../domain/repositories/file-metadata.repository.interface';
import { FILE_METADATA_REPOSITORY } from '../../../domain/repositories/tokens';
import { GetBatchUploadHistoryByContentQuery } from '../get-batch-upload-history-by-content.query';

@QueryHandler(GetBatchUploadHistoryByContentQuery)
export class GetBatchUploadHistoryByContentHandler implements IQueryHandler<GetBatchUploadHistoryByContentQuery> {
  constructor(
    @Inject(FILE_METADATA_REPOSITORY)
    private readonly fileRepository: FileMetadataRepository,
  ) {}

  async execute(query: GetBatchUploadHistoryByContentQuery) {
    if (!query.contentIds || query.contentIds.length === 0) {
      return [];
    }
    const histories = await this.fileRepository.findByContentIds(query.contentIds);
    return histories.map((file) => ({
      id: file.id,
      contentId: file.contentId,
      contentType: file.contentType,
      originalFilename: file.originalFilename,
      mimeType: file.mimeType,
      s3Key: file.s3Key,
      bucket: file.bucket,
      fileSizeBytes: Number(file.fileSizeBytes),
      uploadedBy: file.uploadedBy,
      status: file.status,
      streamingUrl: file.streamingUrl,
      trailerUrl: file.trailerUrl,
      downloadUrl: file.downloadUrl,
      processingError: file.processingError,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    }));
  }
}
