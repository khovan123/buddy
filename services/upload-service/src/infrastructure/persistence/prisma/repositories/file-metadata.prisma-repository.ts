import { Injectable } from '@nestjs/common';

import {
  FileMetadataEntity,
  ProcessingStatus,
} from '../../../../domain/entities/file-metadata.entity';
import {
  CreateFileMetadataInput,
  FileMetadataListParams,
  FileMetadataListResult,
  FileMetadataRepository,
} from '../../../../domain/repositories/file-metadata.repository.interface';
import type { MediaProcessingStatus as PrismaMediaProcessingStatus } from '../generated/enums';
import type { MediaFileWhereInput } from '../generated/models/MediaFile';
import { PrismaService } from '../prisma.service';

/** Repository interface/implementation for  file metadata prisma data access. */
@Injectable()
export class FileMetadataPrismaRepository implements FileMetadataRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executes the create pending operation.
   *
   * @param input - The input parameter
   * @returns Result of type Promise<FileMetadataEntity>
   */
  async createPending(input: CreateFileMetadataInput): Promise<FileMetadataEntity> {
    const result = await this.prisma.client.mediaFile.create({
      data: {
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        s3Key: input.s3Key,
        bucket: input.bucket,
        fileSizeBytes: input.fileSizeBytes,
        uploadedBy: input.uploadedBy,
        contentId: input.contentId,
        contentType: input.contentType,
        status: 'PENDING', // Chuyển sang UPPERCASE
      },
    });

    return result as unknown as FileMetadataEntity;
  }

  /**
   * Executes the mark processing operation.
   *
   * @param id - The id parameter
   */
  async markProcessing(id: string): Promise<void> {
    await this.prisma.client.mediaFile.update({
      where: { id },
      data: { status: 'PROCESSING', processingError: null },
    });
  }

  /**
   * Executes the mark processing if pending operation.
   *
   * @param id - The id parameter
   * @returns Result of type Promise<boolean>
   */
  async markProcessingIfPending(id: string): Promise<boolean> {
    const result = await this.prisma.client.mediaFile.updateMany({
      where: {
        id,
        status: 'PENDING',
      },
      data: {
        status: 'PROCESSING',
        processingError: null,
      },
    });

    return result.count > 0;
  }

  /**
   * Executes the mark completed operation.
   *
   * @param id - The id parameter
   * @param streamingUrl - The streamingUrl parameter
   * @param trailerUrl - The trailerUrl parameter
   * @param downloadUrl - The downloadUrl parameter
   */
  async markCompleted(
    id: string,
    streamingUrl: string | null = null,
    trailerUrl: string | null = null,
    downloadUrl: string | null = null,
  ): Promise<void> {
    await this.prisma.client.mediaFile.update({
      where: { id },
      data: {
        status: 'AVAILABLE', // Chuyển 'completed' thành 'AVAILABLE' cho khớp chuẩn
        streamingUrl,
        trailerUrl,
        downloadUrl,
        processingError: null,
      },
    });
  }

  /**
   * Executes the mark failed operation.
   *
   * @param id - The id parameter
   * @param reason - The reason parameter
   */
  async markFailed(id: string, reason: string): Promise<void> {
    await this.prisma.client.mediaFile.update({
      where: { id },
      data: {
        status: 'FAILED',
        processingError: reason,
      },
    });
  }

  // Bổ sung hàm updateStatus (đang thiếu trong bản cũ)
  /**
   * Executes the update status operation.
   *
   * @param id - The id parameter
   * @param status - The status parameter
   */
  async updateStatus(id: string, status: ProcessingStatus): Promise<void> {
    await this.prisma.client.mediaFile.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Executes the find by id operation.
   *
   * @param id - The id parameter
   * @returns Result of type Promise<FileMetadataEntity | null>
   */
  async findById(id: string): Promise<FileMetadataEntity | null> {
    const result = await this.prisma.client.mediaFile.findUnique({ where: { id } });
    return result ? (result as unknown as FileMetadataEntity) : null;
  }

  /**
   * Executes the find by content id operation.
   *
   * @param contentId - The content id
   * @returns Array of FileMetadataEntity
   */
  async findByContentId(contentId: string): Promise<FileMetadataEntity[]> {
    const data = await this.prisma.client.mediaFile.findMany({
      where: { contentId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    return data as unknown as FileMetadataEntity[];
  }

  /**
   * Executes the find by an array of content ids operation.
   *
   * @param contentIds - The array of content ids
   * @returns Array of FileMetadataEntity
   */
  async findByContentIds(contentIds: string[]): Promise<FileMetadataEntity[]> {
    const data = await this.prisma.client.mediaFile.findMany({
      where: { contentId: { in: contentIds }, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    return data as unknown as FileMetadataEntity[];
  }

  /**
   * Fetches user's upload history filtered by content type.
   *
   * @param userId - The user's ID
   * @param contentType - The content type to filter by
   * @param limit - Optional max number of results
   */
  async findByUserAndContentType(
    userId: string,
    contentType: string,
    limit: number = 200,
  ): Promise<FileMetadataEntity[]> {
    const data = await this.prisma.client.mediaFile.findMany({
      where: { uploadedBy: userId, contentType, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return data as unknown as FileMetadataEntity[];
  }

  /**
   * Fetches paginated upload history for a given user.
   *
   * @param uploadedBy - The user's ID
   * @param params - Pagination and optional status filter
   * @returns Paginated list of file metadata
   */
  async findByUploadedBy(
    uploadedBy: string,
    params: FileMetadataListParams,
  ): Promise<FileMetadataListResult> {
    const { page, limit, status } = params;
    const safeLimit = Math.max(limit, 1);
    const skip = (page - 1) * safeLimit;

    const where: MediaFileWhereInput = {
      uploadedBy,
      deletedAt: null,
    };

    if (status) {
      where.status = status as PrismaMediaProcessingStatus;
    }

    const [data, total] = await Promise.all([
      this.prisma.client.mediaFile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.client.mediaFile.count({ where }),
    ]);

    return {
      data: data as unknown as FileMetadataEntity[],
      total,
    };
  }
}
