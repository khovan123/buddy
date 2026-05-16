import { AppLogger } from '@libs/common';
import { ResourceUploadCompletedEvent } from '@libs/contracts';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
import type { FileMetadataRepository } from '../../../domain/repositories/file-metadata.repository.interface';
import { FILE_METADATA_REPOSITORY } from '../../../domain/repositories/tokens';
import { OutboxService } from '../../../infrastructure/messaging/publishers/outbox.service';
import { S3Service } from '../../../infrastructure/persistence/aws/s3.service';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { SupabaseWebhookDto } from '../dtos/supabase-webhook.dto';
import { ProcessVideoCommand } from '../../../application/commands/process-video.command';

/** Controller handling incoming requests for Webhook. */
@Controller('v1/webhooks/supabase')
export class WebhookController {
  private readonly logger = new AppLogger(WebhookController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly storageService: S3Service,
    @Inject(FILE_METADATA_REPOSITORY)
    private readonly fileRepository: FileMetadataRepository,
  ) {}

  /**
   * Executes the handle storage webhook operation.
   *
   * @param secret - The secret parameter
   * @param payload - The payload parameter
   */
  @Post('storage')
  @HttpCode(HttpStatus.OK)
  async handleStorageWebhook(
    @Headers('x-supabase-webhook-secret') secret: string,
    @Body() payload: SupabaseWebhookDto,
  ) {
    // 1. Xác thực bảo mật (Chống fake webhook)
    const expectedSecret = this.configService.get<string>('SUPABASE_WEBHOOK_SECRET');
    if (secret !== expectedSecret) {
      this.logger.error('Invalid Supabase Webhook Secret');
      throw new UnauthorizedException('Invalid webhook secret');
    }

    const bucketId = payload.record.bucket_id;
    const objectKey = this.normalizeObjectKey(payload.record.name);

    // 2. Bỏ qua nếu không phải bucket của chúng ta quan tâm
    if (bucketId !== 'tutorials' && bucketId !== 'resources') {
      return { received: true, message: 'Ignored unrelated bucket' };
    }

    this.logger.log(`Webhook received for bucket=${bucketId}, object=${objectKey}`);

    try {
      const fileIdFromPath = this.extractFileId(objectKey);
      const resourceIdFromPath = this.extractResourceId(objectKey);

      // Ưu tiên tìm theo fileId nếu parse được; fallback theo s3Key để tránh miss.
      const metadataById = fileIdFromPath
        ? await this.fileRepository.findById(fileIdFromPath)
        : null;
      const metadataByS3Key = metadataById
        ? null
        : await this.prisma.client.mediaFile.findFirst({
            where: { s3Key: objectKey, deletedAt: null },
          });

      const fileMeta = metadataById
        ? {
            id: metadataById.id,
            s3Key: metadataById.s3Key,
            mimeType: metadataById.mimeType,
            uploadedBy: metadataById.uploadedBy,
            originalFilename: metadataById.originalFilename,
            status: metadataById.status,
            fileSizeBytes: metadataById.fileSizeBytes,
            downloadUrl: metadataById.downloadUrl,
          }
        : metadataByS3Key;

      if (!fileMeta) {
        this.logger.warn(`File metadata not found for object=${objectKey}. Ignore webhook.`);
        return { received: true, message: 'No metadata found' };
      }

      const correlationId = this.resolveCorrelationId(payload, fileMeta.id);
      this.logger.log(`File validated: fileId=${fileMeta.id}, correlationId=${correlationId}`);

      // 3) Tutorial: kick ProcessVideoCommand để vào BullMQ + FFmpeg
      if (bucketId === 'tutorials') {
        await this.commandBus.execute(
          new ProcessVideoCommand(
            fileMeta.id,
            fileMeta.s3Key,
            fileMeta.mimeType,
            fileMeta.uploadedBy,
          ),
        );

        this.logger.log(`ProcessVideoCommand dispatched for fileId=${fileMeta.id}`);
        return { received: true, type: 'tutorial', fileId: fileMeta.id };
      }

      // 4) Resource: update AVAILABLE + check batch + put outbox when all done
      const resourceId = resourceIdFromPath;
      await this.prisma.client.$transaction(async (tx) => {
        await tx.mediaFile.updateMany({
          where: { id: fileMeta.id, status: { not: 'AVAILABLE' } },
          data: { status: 'AVAILABLE', processingError: null },
        });

        if (!resourceId) {
          this.logger.warn(
            `Cannot derive resourceId from object key=${objectKey}. Skip batch completion check.`,
          );
          return;
        }

        const resourceFiles = await tx.mediaFile.findMany({
          where: {
            s3Key: { startsWith: `docs/${resourceId}/` },
            deletedAt: null,
          },
          orderBy: { createdAt: 'asc' },
        });

        if (resourceFiles.length === 0) {
          this.logger.warn(`No files found for resourceId=${resourceId}. Skip completion event.`);
          return;
        }

        const isAllAvailable = resourceFiles.every((item) => item.status === 'AVAILABLE');
        if (!isAllAvailable) {
          this.logger.log(
            `Batch not ready for resourceId=${resourceId}. AVAILABLE=${resourceFiles.filter((x) => x.status === 'AVAILABLE').length}/${resourceFiles.length}`,
          );
          return;
        }

        const completedMeta = await Promise.all(
          resourceFiles.map(async (item) => {
            const downloadUrl =
              item.downloadUrl ||
              (await this.storageService.generatePresignedDownloadUrl(item.s3Key));

            if (!item.downloadUrl) {
              await tx.mediaFile.update({
                where: { id: item.id },
                data: { downloadUrl },
              });
            }

            return {
              fileId: item.id,
              s3Key: item.s3Key,
              downloadUrl,
              size: Number(item.fileSizeBytes),
              extension: this.resolveExtension(item.originalFilename),
            };
          }),
        );

        await this.outboxService.put(
          new ResourceUploadCompletedEvent(
            {
              resourceId,
              uploadedBy: fileMeta.uploadedBy,
              meta: completedMeta,
              completedAt: new Date().toISOString(),
            },
            correlationId,
          ),
          tx,
        );

        this.logger.log(
          `RESOURCE_UPLOAD_COMPLETED queued for resourceId=${resourceId}, files=${completedMeta.length}`,
        );
      });

      // Transaction committed → trigger relay immediately
      this.outboxService.notifyFlush();
    } catch (error) {
      this.logger.error(
        `Webhook processing failed for object=${payload.record?.name}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    // Trả về 200 OK ngay lập tức để Supabase biết đã gọi thành công, tránh bị retry
    return { received: true };
  }

  /**
   * Executes the normalize object key operation.
   *
   * @param name - The name parameter
   * @returns Result of type string
   */
  private normalizeObjectKey(name: string): string {
    return decodeURIComponent((name || '').replace(/^\/+/, '')).trim();
  }

  /**
   * Executes the extract file id operation.
   *
   * @param objectKey - The objectKey parameter
   * @returns Result of type string | null
   */
  private extractFileId(objectKey: string): string | null {
    const name = objectKey.split('/').pop() || '';
    const withoutExt = name.replace(/\.[^.]+$/, '');

    // Hỗ trợ cả pattern raw fileId và pattern {fileId}-{timestamp}
    const prefix = withoutExt.split('-')[0];
    return this.isUuid(prefix) ? prefix : this.isUuid(withoutExt) ? withoutExt : null;
  }

  /**
   * Executes the extract resource id operation.
   *
   * @param objectKey - The objectKey parameter
   * @returns Result of type string | null
   */
  private extractResourceId(objectKey: string): string | null {
    // Expected: docs/{resourceId}/<file-name>
    const parts = objectKey.split('/').filter(Boolean);
    if (parts.length >= 3 && parts[0] === 'docs') {
      return parts[1];
    }

    return null;
  }

  /**
   * Executes the resolve correlation id operation.
   *
   * @param payload - The payload parameter
   * @param fallback - The fallback parameter
   * @returns Result of type string
   */
  private resolveCorrelationId(payload: SupabaseWebhookDto, fallback: string): string {
    const metadata = (payload.record.metadata || {}) as Record<string, unknown>;
    const candidate =
      (metadata.correlationId as string | undefined) ||
      (metadata.correlation_id as string | undefined) ||
      (metadata['x-correlation-id'] as string | undefined);

    return (candidate && candidate.trim()) || fallback || randomUUID();
  }

  /**
   * Executes the resolve extension operation.
   *
   * @param fileName - The fileName parameter
   * @returns Result of type string
   */
  private resolveExtension(fileName: string): string {
    const idx = fileName.lastIndexOf('.');
    return idx >= 0 ? fileName.slice(idx).toLowerCase() : '';
  }

  /**
   * Executes the is uuid operation.
   *
   * @param value - The value parameter
   * @returns Result of type boolean
   */
  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
