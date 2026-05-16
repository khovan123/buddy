import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { FileMetadataRepository } from '../../../domain/repositories/file-metadata.repository.interface';
import { FILE_METADATA_REPOSITORY } from '../../../domain/repositories/tokens';
import { GetFileStatusQuery } from '../get-file-status.query';

@QueryHandler(GetFileStatusQuery)
export class GetFileStatusHandler implements IQueryHandler<GetFileStatusQuery> {
  constructor(
    @Inject(FILE_METADATA_REPOSITORY)
    private readonly fileRepository: FileMetadataRepository,
  ) {}

  async execute(query: GetFileStatusQuery) {
    const file = await this.fileRepository.findById(query.fileId);
    if (!file) {
      throw new NotFoundException('File metadata not found');
    }
    return {
      fileId: file.id,
      status: file.status, // PENDING, PROCESSING, AVAILABLE, FAILED
      streamingUrl: file.streamingUrl,
    };
  }
}
