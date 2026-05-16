import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { FileMetadataRepository } from '../../../domain/repositories/file-metadata.repository.interface';
import { FILE_METADATA_REPOSITORY } from '../../../domain/repositories/tokens';
import { GetUploadHistoryByUserQuery } from '../get-upload-history-by-user.query';

@QueryHandler(GetUploadHistoryByUserQuery)
export class GetUploadHistoryByUserHandler implements IQueryHandler<GetUploadHistoryByUserQuery> {
  constructor(
    @Inject(FILE_METADATA_REPOSITORY)
    private readonly fileRepository: FileMetadataRepository,
  ) {}

  async execute(query: GetUploadHistoryByUserQuery) {
    const histories = await this.fileRepository.findByUserAndContentType(
      query.userId,
      query.contentType,
      query.limit,
    );

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
