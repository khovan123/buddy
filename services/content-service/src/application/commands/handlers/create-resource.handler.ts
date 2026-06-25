import {
  ContentType,
  GetPresignedUrlsEvent,
  PresignedUrlsRpcResponse,
  UploadThumbnailEvent,
  UploadType,
} from '@libs/contracts';
import { BadRequestException, HttpException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import slugify from 'slugify';

import { Resource } from '../../../domain/entities/resource.entity';
import type { ICollectionRepository } from '../../../domain/repositories/collection.repository.interface';
import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import {
  COLLECTION_REPOSITORY,
  CONTENT_VALIDATION_SERVICE,
  RESOURCE_REPOSITORY,
} from '../../../domain/repositories/tokens';
import type { IContentValidationService } from '../../../domain/services/content-validation.service';
import { StorageBrokerPublisher } from '../../../infrastructure/messaging/publishers/storage-broker.rpc';
import { CollectionType } from '../../../infrastructure/persistence/mongo/schemas/collection.schema';
import { ResourceStatus } from '../../../infrastructure/persistence/mongo/schemas/resource.schema';
import { CreateResourceCommand } from '../create-resource.command';

const RESOURCE_ALLOWED_FILE_EXTENSIONS = new Set(['.txt', '.docx', '.md', '.pdf']);
const RESOURCE_ALLOWED_FILE_TYPES_MESSAGE = 'Resource files must be .txt, .docx, .md, or .pdf';

/**
 * CreateResourceHandler - Xử lý tạo Resource.
 *
 * Workflow:
 * 1. Validate majorId/courseId
 * 2. Validate collection nếu có
 * 3. Tạo Resource metadata với status PENDING
 * 4. Gọi upload-service để lấy presigned URL (via HTTP)
 * 5. Return resource metadata + uploadUrl + estimatedTime cho client
 * 6. Client upload trực tiếp lên S3 dùng presigned URL
 * 7. Upload service phát `file.processed` event sau khi file được upload
 * 8. Content service consume event và cập nhật resource với downloadUrl
 */
@CommandHandler(CreateResourceCommand)
export class CreateResourceHanlder implements ICommandHandler<CreateResourceCommand> {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: ICollectionRepository,
    @Inject(CONTENT_VALIDATION_SERVICE)
    private readonly contentValidationService: IContentValidationService,
    private readonly storageBrokerPublisher: StorageBrokerPublisher,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param command - The command parameter
   */
  async execute(command: CreateResourceCommand) {
    const {
      userId,
      title,
      summary,
      hightlights,
      majorId,
      courseId,
      price,
      files,
      thumbnailBase64,
      collectionId,
    } = command;

    if (!files || files.length === 0) {
      throw new BadRequestException('files is required');
    }
    this.validateResourceFiles(files);

    // 1. Validate majorId và courseId tồn tại
    await this.contentValidationService.validateMajorExists(majorId);
    await this.contentValidationService.validateCourseExists(courseId, majorId);

    // 2. Validate collection nếu có
    if (collectionId) {
      const collection = await this.collectionRepository.findByIdWithType(
        collectionId,
        CollectionType.RESOURCE,
      );

      if (!collection) {
        throw new BadRequestException('Collection must be type Resource');
      }
    }

    // 3. Generate SEO-friendly slug từ title
    const baseSlug = slugify(title, { lower: true, strict: true, locale: 'vi' });
    let slug = baseSlug;
    let counter = 1;

    while (await this.resourceRepository.findBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 4. Tạo Resource metadata với status PENDING
    const resource = Resource.create({
      userId,
      title,
      slug,
      summary,
      hightlights,
      majorId,
      courseId,
      price,
      meta: files.map((file, index) => ({
        fileId: `pending-${index + 1}`,
        s3Key: '', // populated later
        downloadUrl: '',
        fileSize: file.fileSizeBytes,
        extension: this.resolveExtension(file.fileName),
      })),
      collectionId,
    });

    // Lưu resource vào DB
    await this.resourceRepository.save(resource);

    // 5. Gọi upload-service để lấy danh sách presigned URLs qua RabbitMQ RPC
    let presignedUrlsResponse: PresignedUrlsRpcResponse;
    try {
      const event = new GetPresignedUrlsEvent(
        {
          files,
          uploadType: UploadType.RESOURCE,
          uploadedBy: userId,
          contentId: resource.id,
          contentType: ContentType.RESOURCE,
        },
        command.correlationId,
      );

      presignedUrlsResponse = await this.storageBrokerPublisher.getPresignedUrls(event);
    } catch (error: unknown) {
      // Rollback: xóa resource đã tạo vì không thể lấy presigned URL
      await this.resourceRepository.delete(resource.id);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        `Failed to get presigned URL from upload-service via RPC: ${errorMessage}`,
        500,
      );
    }

    resource.meta = presignedUrlsResponse.uploadUrls.map((item) => ({
      fileId: item.fileId,
      s3Key: item.s3Key,
      downloadUrl: '',
      fileSize: item.fileSizeBytes,
      extension: this.resolveExtension(item.fileName),
    }));
    await this.resourceRepository.update(resource);

    // 6.5. Emit async thumbnail upload event (fire-and-forget)
    if (thumbnailBase64) {
      try {
        console.log(
          `[CreateResource] Emitting thumbnail upload event: ` +
            `resourceId=${resource.id}, base64Length=${thumbnailBase64.length}`,
        );
        const thumbnailEvent = new UploadThumbnailEvent(
          {
            imageBase64: thumbnailBase64,
            folder: 'resources',
            publicId: `resource-${resource.id}`,
            contentId: resource.id,
            contentType: 'resource',
          },
          command.correlationId,
        );
        await this.storageBrokerPublisher.emitThumbnailUpload(thumbnailEvent);
      } catch (error) {
        // Log but don't fail the whole creation — thumbnail is optional & async
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          `[CreateResource] Failed to emit thumbnail upload event for resource ${resource.id}: ${errorMsg}`,
        );
      }
    }

    // 9. Return resourceId + danh sách uploadUrls cho client upload trực tiếp
    return {
      resourceId: resource.id,
      slug: resource.slug,
      majorId,
      courseId,
      status: ResourceStatus.PENDING,
      uploadUrls: presignedUrlsResponse.uploadUrls,
    };
  }

  /**
   * Executes the resolve extension operation.
   *
   * @param fileName - The fileName parameter
   * @returns Result of type string
   */
  private resolveExtension(fileName?: string): string {
    if (!fileName) return '';
    const idx = fileName.lastIndexOf('.');
    return idx >= 0 ? fileName.slice(idx).toLowerCase() : '';
  }

  private validateResourceFiles(files: Array<{ fileName: string }>): void {
    const invalidFiles = files.filter(
      (file) => !RESOURCE_ALLOWED_FILE_EXTENSIONS.has(this.resolveExtension(file.fileName)),
    );

    if (invalidFiles.length > 0) {
      throw new BadRequestException({
        message: RESOURCE_ALLOWED_FILE_TYPES_MESSAGE,
        invalidFiles: invalidFiles.map((file) => file.fileName),
      });
    }
  }
}
