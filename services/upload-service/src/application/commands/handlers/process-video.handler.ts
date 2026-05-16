import { InjectQueue } from '@nestjs/bullmq';
import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Queue } from 'bullmq';

import { AppLogger, QUEUES } from '@libs/common';
import { UPLOAD_ROUTINGKEYS, VideoProcessingJobEvent } from '@libs/contracts';

import type { FileMetadataRepository } from '../../../domain/repositories/file-metadata.repository.interface';
import { FILE_METADATA_REPOSITORY } from '../../../domain/repositories/tokens';
import { ProcessVideoCommand } from '../process-video.command';

/** CQRS Handler to execute  process video. */
@CommandHandler(ProcessVideoCommand)
export class ProcessVideoHandler implements ICommandHandler<
  ProcessVideoCommand,
  { fileId: string; status: string; message: string }
> {
  private readonly logger = new AppLogger(ProcessVideoHandler.name);

  constructor(
    @Inject(FILE_METADATA_REPOSITORY)
    private readonly fileRepository: FileMetadataRepository,

    // Nguồn định nghĩa Queue chuẩn từ libs/common
    @InjectQueue(QUEUES.VIDEO_PROCESSING_QUEUE)
    private readonly videoQueue: Queue<VideoProcessingJobEvent['payload']>,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param command - The command parameter
   * @returns Result of type Promise<{ fileId: string; status: string; message: string }>
   */
  async execute(
    command: ProcessVideoCommand,
  ): Promise<{ fileId: string; status: string; message: string }> {
    // 1. Atomic claim: chỉ 1 trigger được chuyển PENDING -> PROCESSING
    const claimed = await this.fileRepository.markProcessingIfPending(command.fileId);

    // 2. Đọc metadata để phản hồi trạng thái hiện tại
    const metadata = await this.fileRepository.findById(command.fileId);

    if (!metadata) {
      this.logger.error(`File metadata not found for ID: ${command.fileId}`);
      throw new NotFoundException('File metadata not found.');
    }

    if (!claimed) {
      this.logger.warn(
        `Idempotency trigger: File ${command.fileId} is already in status [${metadata.status}]. Skipping queue.`,
      );
      return {
        fileId: metadata.id,
        status: metadata.status,
        message: 'File is already being processed or completed.',
      };
    }

    // 3. Bắn Job vào BullMQ theo shape thống nhất với Worker (job.data)
    try {
      await this.videoQueue.add(UPLOAD_ROUTINGKEYS.VIDEO_PROCESSING_JOB, {
        fileId: metadata.id,
        s3Key: metadata.s3Key || command.s3Key,
        originalFilename: metadata.originalFilename,
        mimeType: metadata.mimeType || command.mimeType,
        uploadedBy: metadata.uploadedBy || command.uploadedBy,
      });
    } catch (error) {
      // Queue add fail thì trả trạng thái về PENDING để tránh bị kẹt PROCESSING.
      await this.fileRepository.updateStatus(metadata.id, 'PENDING');
      throw error;
    }

    this.logger.log(`Added processing job for file [${metadata.id}] to BullMQ`);

    return {
      fileId: metadata.id,
      status: 'PROCESSING',
      message: 'Video processing job queued successfully.',
    };
  }
}
