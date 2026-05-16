import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { FILE_METADATA_REPOSITORY } from '../../../domain/repositories/tokens';
import type { FileMetadataRepository } from '../../../domain/repositories/file-metadata.repository.interface';
import { GetUploadHistoryQuery } from '../get-upload-history.query';

/** Handler for GetUploadHistoryQuery — returns paginated upload history. */
@QueryHandler(GetUploadHistoryQuery)
export class GetUploadHistoryHandler implements IQueryHandler<GetUploadHistoryQuery> {
  constructor(
    @Inject(FILE_METADATA_REPOSITORY)
    private readonly fileRepository: FileMetadataRepository,
  ) {}

  async execute(query: GetUploadHistoryQuery) {
    const { uploadedBy, page, limit, status } = query;

    const result = await this.fileRepository.findByUploadedBy(uploadedBy, {
      page,
      limit,
      status,
    });

    return {
      data: result.data.map((file) => ({
        id: file.id,
        originalFilename: file.originalFilename,
        mimeType: file.mimeType,
        bucket: file.bucket,
        fileSizeBytes: file.fileSizeBytes,
        status: file.status,
        downloadUrl: file.downloadUrl,
        streamingUrl: file.streamingUrl,
        processingError: file.processingError,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      })),
      meta: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }
}
