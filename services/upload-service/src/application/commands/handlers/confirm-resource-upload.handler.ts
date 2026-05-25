import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Queue } from 'bullmq';

import { AppLogger, getCorrelationId, QUEUES } from '@libs/common';

import { ResourceUploadCompletedEvent, UPLOAD_ROUTINGKEYS } from '@libs/contracts';
import type { FileMetadataRepository } from '../../../domain/repositories/file-metadata.repository.interface';
import { FILE_METADATA_REPOSITORY } from '../../../domain/repositories/tokens';
import { PreviewProcessorContext } from '../../../domain/services/preview-processor.context';
import { resolveExtension } from '../../../domain/services/resolver';
import { OutboxService } from '../../../infrastructure/messaging/publishers/outbox.service';
import { S3Service } from '../../../infrastructure/persistence/aws/s3.service';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { type ContentExtractionJobData } from '../../../infrastructure/workers/content-extraction.worker';
import type { DocumentPreviewJobData } from '../../../infrastructure/workers/document-preview.worker';
import { ConfirmResourceUploadCommand } from '../confirm-resource-upload.command';

/** CQRS Handler to execute  process video. */
@CommandHandler(ConfirmResourceUploadCommand)
export class ConfirmResourceUploadHandler implements ICommandHandler<ConfirmResourceUploadCommand> {
  private readonly logger = new AppLogger(ConfirmResourceUploadHandler.name);

  constructor(
    @Inject(FILE_METADATA_REPOSITORY)
    private readonly fileRepository: FileMetadataRepository,
    private readonly outboxService: OutboxService,
    private readonly storageService: S3Service,
    private readonly prisma: PrismaService,
    private readonly previewProcessor: PreviewProcessorContext,
    @InjectQueue(QUEUES.DOCUMENT_PREVIEW_QUEUE)
    private readonly previewQueue: Queue<DocumentPreviewJobData>,
    @InjectQueue(QUEUES.CONTENT_EXTRACTION_QUEUE)
    private readonly extractionQueue: Queue<ContentExtractionJobData>,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param command - The command parameter
   * @returns Result of type Promise<{ fileId: string; status: string; message: string }>
   */
  async execute(
    command: ConfirmResourceUploadCommand,
  ): Promise<{ resourceId: string; fileCount: number; message: string; correlationId: string }> {
    const uniqueFileIds = Array.from(new Set(command.fileIds));

    if (uniqueFileIds.length !== command.fileIds.length) {
      throw new BadRequestException('fileIds must be unique');
    }

    const fileMetas = await Promise.all(
      uniqueFileIds.map((fileId) => this.fileRepository.findById(fileId)),
    );
    const missingFileIds = uniqueFileIds.filter((_, index) => !fileMetas[index]);
    if (missingFileIds.length > 0) {
      throw new NotFoundException(`File metadata not found for ids: ${missingFileIds.join(', ')}`);
    }

    const validFileMetas = fileMetas.filter((meta): meta is NonNullable<typeof meta> =>
      Boolean(meta),
    );

    const metaPayload = await Promise.all(
      validFileMetas.map(async (meta) => {
        const downloadUrl = await this.storageService.generatePresignedDownloadUrl(meta.s3Key);
        return {
          fileId: meta.id,
          downloadUrl,
          size: Number(meta.fileSizeBytes),
          extension: resolveExtension(meta.originalFilename),
          s3Key: meta.s3Key,
          mimeType: meta.mimeType,
          originalFilename: meta.originalFilename,
        };
      }),
    );

    const correlationId = getCorrelationId() ?? command.resourceId;

    await this.prisma.client.$transaction(async (tx) => {
      for (const item of metaPayload) {
        await tx.mediaFile.update({
          where: { id: item.fileId },
          data: {
            status: 'AVAILABLE',
            downloadUrl: item.downloadUrl,
            processingError: null,
          },
        });
      }

      await this.outboxService.put(
        new ResourceUploadCompletedEvent(
          {
            resourceId: command.resourceId,
            uploadedBy: command.userId,
            meta: metaPayload.map(
              ({ fileId, s3Key, downloadUrl, size, extension, mimeType, originalFilename }) => ({
                fileId,
                s3Key,
                downloadUrl,
                size,
                extension,
                mimeType,
                originalFilename,
              }),
            ),
            completedAt: new Date().toISOString(),
          },
          correlationId,
        ),
        tx,
      );
    });

    // Enqueue content extraction as part of the confirm workflow.
    // If scheduling fails, compensate the outbox row so the relay
    // does not publish ResourceUploadCompletedEvent without an
    // extraction/moderation job, then re-throw so the client can retry.
    try {
      await this.extractionQueue.add('extract-resource-content', {
        contentId: command.resourceId,
        contentType: 'RESOURCE',
        fileIds: uniqueFileIds,
        uploadedBy: command.userId,
        correlationId,
      });
    } catch (enqueueError) {
      this.logger.error(
        `Extraction enqueue failed for resource ${command.resourceId}, compensating outbox`,
        enqueueError instanceof Error ? enqueueError.stack : String(enqueueError),
      );

      await this.outboxService.compensate(
        correlationId,
        UPLOAD_ROUTINGKEYS.RESOURCE_UPLOAD_COMPLETED,
      );

      throw enqueueError;
    }

    // ── Pre-generation: queue preview for supported formats ─────
    // Fire-and-forget — failures handled by BullMQ retry mechanism
    for (const meta of validFileMetas) {
      if (this.previewProcessor.isSupported(meta.mimeType)) {
        try {
          await this.previewQueue.add('generate-preview', { fileId: meta.id });
          this.logger.debug(`Queued preview generation for file ${meta.id} (${meta.mimeType})`);
        } catch (e) {
          this.logger.warn(
            `Failed to queue preview for file ${meta.id}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
    }

    this.outboxService.notifyFlush();

    return {
      message: 'Resource files confirmed and outbox event queued',
      resourceId: command.resourceId,
      fileCount: metaPayload.length,
      correlationId,
    };
  }
}
