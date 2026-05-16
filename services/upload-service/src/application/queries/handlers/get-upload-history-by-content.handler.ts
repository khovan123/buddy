import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import type { FileMetadataEntity } from '../../../domain/entities/file-metadata.entity';
import type { FileMetadataRepository } from '../../../domain/repositories/file-metadata.repository.interface';
import { FILE_METADATA_REPOSITORY } from '../../../domain/repositories/tokens';
import { GetUploadHistoryByContentQuery } from '../get-upload-history-by-content.query';

@QueryHandler(GetUploadHistoryByContentQuery)
export class GetUploadHistoryByContentHandler implements IQueryHandler<GetUploadHistoryByContentQuery> {
  constructor(
    @Inject(FILE_METADATA_REPOSITORY)
    private readonly fileRepository: FileMetadataRepository,
  ) {}

  async execute(query: GetUploadHistoryByContentQuery): Promise<FileMetadataEntity[]> {
    const histories = await this.fileRepository.findByContentId(query.contentId);
    return histories.map((file) => ({
      ...file,
      fileSizeBytes: Number(file.fileSizeBytes),
    })) as FileMetadataEntity[];
  }
}
