import { InjectQueue } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Queue } from 'bullmq';

import { AppLogger, QUEUES } from '@libs/common';
import { PresignedUrlResult, UploadType } from '@libs/contracts';
import type { FileMetadataRepository } from '../../../domain/repositories/file-metadata.repository.interface';
import { FILE_METADATA_REPOSITORY, STORAGE_PROVIDER } from '../../../domain/repositories/tokens';
import { ETACalculator } from '../../../domain/services/eta.calculator';
import { GetUploadUrlQuery } from '../get-upload-url.query';

type StorageProvider = {
  generatePresignedUploadUrl(
    fileName: string,
    uploadType: UploadType,
    keyPrefix?: string,
  ): Promise<{ fileKey: string; uploadUrl: string; bucket: string; mimeType: string }>;
};

/**
 * GetUploadUrlHandler - CQRS Query Handler để lấy presigned upload URL.
 *
 * Flow:
 * 1. Gọi IStorageProvider.generatePresignedUploadUrl() để lấy fileKey và uploadUrl.
 * 2. Tính toán ETA dựa trên UploadType:
 *    - Resource: ETA = ceil(fileSizeMB / 2)
 *    - Tutorial: ETA = T_upload + (duration * 0.3) + (queueLength * 5)
 * 3. Return {fileId, uploadUrl, estimatedTime}
 */
@QueryHandler(GetUploadUrlQuery)
export class GetUploadUrlHandler implements IQueryHandler<GetUploadUrlQuery> {
  private readonly logger = new AppLogger(GetUploadUrlHandler.name);

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
    @Inject(FILE_METADATA_REPOSITORY)
    private readonly fileRepository: FileMetadataRepository,
    @InjectQueue(QUEUES.VIDEO_PROCESSING_QUEUE)
    private readonly videoQueue: Queue,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param query - The query parameter
   * @returns Result of type Promise<{
   *     fileId: string;
   *     s3Key: string;
   *     uploadUrl: string;
   *     estimatedTime: number;
   *   }>
   */
  async execute(query: GetUploadUrlQuery): Promise<PresignedUrlResult> {
    // Lấy presigned URL từ storage provider
    const { fileName, fileSizeBytes, uploadType, uploadedBy, contentId, contentType, keyPrefix } =
      query;
    const startedAt = Date.now();
    this.logger.log('Generating presigned upload URL', {
      fileName,
      fileSizeBytes,
      uploadType,
      contentId,
      contentType,
      keyPrefix,
    });
    const presignStartedAt = Date.now();
    const {
      fileKey: s3Key,
      uploadUrl,
      bucket,
      mimeType,
    } = await this.storageProvider.generatePresignedUploadUrl(fileName, uploadType, keyPrefix);
    this.logger.log('Generated presigned upload URL', {
      fileName,
      uploadType,
      contentId,
      bucket,
      s3Key,
      elapsedMs: Date.now() - presignStartedAt,
    });

    const metadataStartedAt = Date.now();
    const metadata = await this.fileRepository.createPending({
      originalFilename: query.fileName,
      mimeType: mimeType,
      s3Key,
      bucket,
      fileSizeBytes,
      uploadedBy,
      contentId,
      contentType,
    });
    this.logger.log('Created pending upload metadata', {
      fileId: metadata.id,
      fileName,
      uploadType,
      contentId,
      elapsedMs: Date.now() - metadataStartedAt,
    });

    // Tính toán ETA dựa trên upload type
    let estimatedTime: number;

    if (query.uploadType === UploadType.RESOURCE) {
      // Resource: chỉ upload, không xử lý
      estimatedTime = ETACalculator.calculateResourceETA(query.fileSizeBytes);
    } else if (query.uploadType === UploadType.TUTORIAL) {
      // Tutorial: upload + transcode + queue wait
      const queueLength = await this.videoQueue.count();
      estimatedTime = ETACalculator.calculateTutorialETA(query.fileSizeBytes, queueLength);
    } else {
      throw new Error(`Unknown upload type: ${query.uploadType}`);
    }

    this.logger.log('Prepared upload URL response', {
      fileId: metadata.id,
      fileName,
      uploadType,
      contentId,
      estimatedTime,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      fileId: metadata.id,
      fileName,
      fileSizeBytes,
      mimeType,
      s3Key,
      uploadUrl,
      estimatedTime,
    };
  }
}
