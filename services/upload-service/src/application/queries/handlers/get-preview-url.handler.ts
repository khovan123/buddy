import { AppLogger, QUEUES } from '@libs/common';
import { PreviewStatus, PreviewUrlRpcResponse } from '@libs/contracts';
import { InjectQueue } from '@nestjs/bullmq';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Queue } from 'bullmq';

import { PreviewProcessorContext } from '../../../domain/services/preview-processor.context';
import type { DocumentPreviewJobData } from '../../../infrastructure/workers/document-preview.worker';
import { S3Service } from '../../../infrastructure/persistence/aws/s3.service';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { GetPreviewUrlQuery } from '../get-preview-url.query';

/** Default preview percentage (30%) */
const DEFAULT_PREVIEW_PERCENTAGE = 30;
const PREVIEW_PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * GetPreviewUrlHandler — Handles document preview URL requests.
 *
 * Accepts `s3Key` directly from content-service (cached in Resource).
 * Looks up the MediaFile by s3Key to check preview status.
 *
 * Flow:
 * 1. Look up file by s3Key
 * 2. If preview AVAILABLE → generate inline signed URL
 * 3. If PROCESSING → return { isReady: false, status: PROCESSING }
 * 4. If PENDING/FAILED and format supported → queue job, return PROCESSING
 * 5. If format unsupported → return UNSUPPORTED
 */
@QueryHandler(GetPreviewUrlQuery)
export class GetPreviewUrlHandler implements IQueryHandler<GetPreviewUrlQuery> {
  private readonly logger = new AppLogger(GetPreviewUrlHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly previewProcessor: PreviewProcessorContext,
    @InjectQueue(QUEUES.DOCUMENT_PREVIEW_QUEUE)
    private readonly previewQueue: Queue<DocumentPreviewJobData>,
  ) {}

  async execute(query: GetPreviewUrlQuery): Promise<PreviewUrlRpcResponse> {
    const { s3Key } = query;

    // 1. Look up file by s3Key
    const mediaFile = await this.prisma.client.mediaFile.findFirst({
      where: { s3Key, deletedAt: null },
      select: {
        id: true,
        previewS3Key: true,
        previewStatus: true,
        mimeType: true,
        originalFilename: true,
        updatedAt: true,
      },
    });

    if (!mediaFile) {
      this.logger.warn(`File with s3Key=${s3Key} not found or deleted`);
      return this.buildOriginalFilePreview(s3Key);
    }

    // 2. If preview is already available → generate inline signed URL
    if (mediaFile.previewS3Key && mediaFile.previewStatus === 'AVAILABLE') {
      const previewUrl = await this.s3Service.generatePreviewSignedUrl(
        mediaFile.previewS3Key,
        this.previewProcessor.getPreviewMimeType(mediaFile.mimeType, mediaFile.originalFilename),
      );

      return {
        previewUrl,
        isReady: true,
        isPreview: true,
        previewPercentage: DEFAULT_PREVIEW_PERCENTAGE,
        status: PreviewStatus.AVAILABLE,
      };
    }

    // 3. If preview is already being processed → return pending unless stale
    if (mediaFile.previewStatus === 'PROCESSING') {
      if (this.isStaleProcessing(mediaFile.updatedAt)) {
        this.logger.warn(
          `Preview processing timed out for file ${mediaFile.id} (s3Key=${s3Key}); marking failed`,
        );
        await this.prisma.client.mediaFile.update({
          where: { id: mediaFile.id },
          data: {
            previewStatus: 'FAILED',
            processingError: 'Preview generation timed out.',
          },
        });

        return this.buildOriginalFilePreview(s3Key, mediaFile.mimeType);
      }

      return this.buildOriginalFilePreview(s3Key, mediaFile.mimeType);
    }

    if (mediaFile.previewStatus === 'FAILED') {
      return this.buildOriginalFilePreview(s3Key, mediaFile.mimeType);
    }

    // 4. Check if format is supported
    if (!this.previewProcessor.isSupported(mediaFile.mimeType, mediaFile.originalFilename)) {
      this.logger.debug(
        `Preview not supported for mimeType=${mediaFile.mimeType}, fileName=${mediaFile.originalFilename}`,
      );
      return this.buildOriginalFilePreview(s3Key, mediaFile.mimeType);
    }

    // 5. Queue a new generation job (PENDING or FAILED → retry)
    this.logger.log(`Queueing preview generation for file ${mediaFile.id} (s3Key=${s3Key})`);

    try {
      await this.prisma.client.mediaFile.update({
        where: { id: mediaFile.id },
        data: { previewStatus: 'PROCESSING' },
      });

      await this.previewQueue.add('generate-preview', { fileId: mediaFile.id });
    } catch (error) {
      this.logger.warn(
        `Preview queue failed for file ${mediaFile.id}; serving original inline fallback: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return this.buildOriginalFilePreview(s3Key, mediaFile.mimeType);
  }

  private isStaleProcessing(updatedAt: Date): boolean {
    return Date.now() - updatedAt.getTime() > PREVIEW_PROCESSING_TIMEOUT_MS;
  }

  private async buildOriginalFilePreview(
    s3Key: string,
    mimeType?: string,
  ): Promise<PreviewUrlRpcResponse> {
    const previewUrl = await this.s3Service.generatePreviewSignedUrl(s3Key, mimeType);

    return {
      previewUrl,
      isReady: true,
      isPreview: true,
      previewPercentage: DEFAULT_PREVIEW_PERCENTAGE,
      status: PreviewStatus.AVAILABLE,
    };
  }
}
