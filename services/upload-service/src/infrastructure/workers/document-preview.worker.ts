import { AppLogger, QUEUES } from '@libs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { PreviewProcessorContext } from '../../domain/services/preview-processor.context';
import { UnsupportedFormatError } from '../../domain/services/preview-processor.interface';
import { S3Service } from '../persistence/aws/s3.service';
import { PrismaService } from '../persistence/prisma/prisma.service';

/**
 * Job payload for document preview generation.
 *
 * SECURITY: Only fileId is accepted. The worker MUST look up
 * s3Key and mimeType from the database — never trust external data.
 */
export interface DocumentPreviewJobData {
  fileId: string;
}

/** Default preview percentage (30%) */
const DEFAULT_PREVIEW_PERCENTAGE = 0.3;

/**
 * DocumentPreviewWorker — BullMQ worker that generates document previews.
 *
 * Flow:
 * 1. Look up s3Key/mimeType from DB (security-first)
 * 2. Check if preview already exists in S3 (cache hit → skip)
 * 3. Download original file from S3
 * 4. Process through PreviewProcessorContext (Strategy Pattern)
 * 5. Upload preview to S3 at previews/30pct/{original-key}
 * 6. Update MediaFile record with previewS3Key
 */
@Processor(QUEUES.DOCUMENT_PREVIEW_QUEUE)
export class DocumentPreviewWorker extends WorkerHost {
  private readonly logger = new AppLogger(DocumentPreviewWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly previewProcessor: PreviewProcessorContext,
  ) {
    super();
  }

  async process(job: Job<DocumentPreviewJobData>): Promise<void> {
    const { fileId } = job.data;

    this.logger.log(`Processing preview for file ${fileId}`);

    try {
      // ── 1. Security-first: look up file metadata from DB ─────────
      const mediaFile = await this.prisma.client.mediaFile.findUnique({
        where: { id: fileId },
        select: {
          s3Key: true,
          mimeType: true,
          previewS3Key: true,
          previewStatus: true,
          deletedAt: true,
        },
      });

      if (!mediaFile) {
        this.logger.warn(`File ${fileId} not found in DB, skipping preview`);
        return;
      }

      if (mediaFile.deletedAt) {
        this.logger.warn(`File ${fileId} is deleted, skipping preview`);
        return;
      }

      const { s3Key, mimeType } = mediaFile;

      // ── 2. Check S3 cache — skip if preview already exists ───────
      const previewKey = this.s3Service.getPreviewKey(s3Key);
      const exists = await this.s3Service.headObject(previewKey);

      if (exists) {
        this.logger.log(`Preview already exists for ${fileId}, updating DB only`);
        await this.prisma.client.mediaFile.update({
          where: { id: fileId },
          data: {
            previewS3Key: previewKey,
            previewStatus: 'AVAILABLE',
          },
        });
        return;
      }

      // ── 3. Download original file from S3 ────────────────────────
      this.logger.debug(`Downloading original file: ${s3Key}`);
      const originalBuffer = await this.s3Service.getObjectBuffer(s3Key);

      // ── 4. Generate preview via Strategy Pattern ─────────────────
      const previewBuffer = await this.previewProcessor.generatePreview(
        originalBuffer,
        mimeType,
        DEFAULT_PREVIEW_PERCENTAGE,
      );
      const previewMimeType = this.previewProcessor.getPreviewMimeType(mimeType);

      // ── 5. Upload preview to S3 ─────────────────────────────────
      this.logger.debug(`Uploading preview to: ${previewKey}`);
      await this.s3Service.uploadBuffer(previewKey, previewBuffer, previewMimeType);

      // ── 6. Update database ──────────────────────────────────────
      await this.prisma.client.mediaFile.update({
        where: { id: fileId },
        data: {
          previewS3Key: previewKey,
          previewStatus: 'AVAILABLE',
        },
      });

      this.logger.log(
        `Preview generated for ${fileId}: ${originalBuffer.length} → ${previewBuffer.length} bytes`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown preview error';
      const isUnsupported = error instanceof UnsupportedFormatError;

      // For unsupported formats, don't retry — mark as failed permanently
      if (isUnsupported) {
        this.logger.warn(`Unsupported format for preview: fileId=${fileId}, skipping`);
        await this.prisma.client.mediaFile.update({
          where: { id: fileId },
          data: {
            previewStatus: 'FAILED',
          },
        });
        return;
      }

      // For other errors, mark as failed and let BullMQ retry
      this.logger.error(`Failed to generate preview for ${fileId}: ${reason}`);
      await this.prisma.client.mediaFile.update({
        where: { id: fileId },
        data: {
          previewStatus: 'FAILED',
        },
      });

      throw error;
    }
  }
}
