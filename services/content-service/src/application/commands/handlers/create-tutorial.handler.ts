import {
  ContentType,
  GetPresignedUrlEvent,
  PresignedUrlRpcResponse,
  UploadType,
} from '@libs/contracts';
import { BadRequestException, HttpException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import slugify from 'slugify';

import { Tutorial, TutorialMedia } from '../../../domain/entities/tutorial.entity';
import type { ICollectionRepository } from '../../../domain/repositories/collection.repository.interface';
import {
  COLLECTION_REPOSITORY,
  CONTENT_VALIDATION_SERVICE,
  TUTORIAL_REPOSITORY,
} from '../../../domain/repositories/tokens';
import type { ITutorialRepository } from '../../../domain/repositories/tutorial.repository.interface';
import type { IContentValidationService } from '../../../domain/services/content-validation.service';
import { RecommendationSyncPublisher } from '../../../infrastructure/messaging/publishers/recommendation-sync.publisher';
import { StorageBrokerPublisher } from '../../../infrastructure/messaging/publishers/storage-broker.rpc';
import { CollectionType } from '../../../infrastructure/persistence/mongo/schemas/collection.schema';
import { TutorialStatus } from '../../../infrastructure/persistence/mongo/schemas/tutorial.schema';
import { CreateTutorialCommand } from '../create-tutorial.command';

/**
 * CreateTutorialHandler - Xử lý tạo Tutorial.
 *
 * Workflow (New - Presigned URL):
 * 1. Validate majorId/courseId và resource/collection integrity
 * 2. Tạo Tutorial metadata với status PROCESSING
 * 3. Gọi upload-service để lấy presigned URL (có tính toán ETA)
 * 4. Return tutorial metadata + uploadUrl + estimatedTime cho client
 * 5. Client upload trực tiếp lên S3 dùng presigned URL
 * 6. Upload service xử lý video và phát `file.processed` event
 * 7. Content service consume event và cập nhật tutorial
 */
@CommandHandler(CreateTutorialCommand)
export class CreateTutorialHanlder implements ICommandHandler<CreateTutorialCommand> {
  constructor(
    @Inject(TUTORIAL_REPOSITORY)
    private readonly tutorialRepository: ITutorialRepository,
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: ICollectionRepository,
    @Inject(CONTENT_VALIDATION_SERVICE)
    private readonly contentValidationService: IContentValidationService,
    private readonly storageBrokerPublisher: StorageBrokerPublisher,
    private readonly recommendationSync: RecommendationSyncPublisher,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param command - The command parameter
   */
  async execute(command: CreateTutorialCommand) {
    const {
      userId,
      title,
      description,
      hightlights,
      majorId,
      courseId,
      price,
      discountBundle,
      fileName,
      fileSizeBytes,
      videoDurationSeconds,
      collectionId,
      resourceIds,
      collectionIds,
      steps,
    } = command;

    let finalResourceIds = resourceIds;
    if (steps && steps.length > 0) {
      const derivedResourceIds = steps.flatMap((s) => s.resources.map((r) => r.resourceId));
      if (!finalResourceIds || finalResourceIds.length === 0) {
        finalResourceIds = Array.from(new Set(derivedResourceIds));
      }
    }

    // 1. Validate majorId và courseId tồn tại
    await this.contentValidationService.validateMajorExists(majorId);
    await this.contentValidationService.validateCourseExists(courseId, majorId);

    // 2. Validate resource/collection integrity
    if (collectionId && finalResourceIds && finalResourceIds.length > 0) {
      throw new BadRequestException('Just choose one option in collection or resources');
    }

    // Validate resources cùng majorId & courseId
    if (finalResourceIds && finalResourceIds.length > 0) {
      await this.contentValidationService.validateTargetIntegrity({
        majorId,
        courseId,
        resourceIds: finalResourceIds,
      });

      const existing = await this.tutorialRepository.findByResourceIds(finalResourceIds);
      if (existing && existing.length > 0) {
        throw new BadRequestException('Existing at least one resource belongs to another tutorial');
      }
    }

    // Validate collections cùng majorId & courseId
    if (collectionIds && collectionIds.length > 0) {
      await this.contentValidationService.validateTargetIntegrity({
        majorId,
        courseId,
        collectionIds,
      });
    }

    if (collectionId) {
      const collection = await this.collectionRepository.findByIdWithType(
        collectionId,
        CollectionType.TUTORIAL,
      );

      if (!collection) {
        throw new BadRequestException('Collection must be type Tutorial');
      }
    }

    // 3. Generate SEO-friendly slug từ title
    const baseSlug = slugify(title, { lower: true, strict: true, locale: 'vi' });
    let slug = baseSlug;
    let counter = 1;

    while (await this.tutorialRepository.findBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 4. Tạo Tutorial metadata với status PENDING
    const media: TutorialMedia = {
      fileId: 'pending', // Sẽ cập nhật khi nhận file.processed event
      videoUrl: null,
      streamingUrl: null,
      trailerUrl: null,
      duration: videoDurationSeconds,
      fileSize: fileSizeBytes,
      extension: fileName ? fileName.substring(fileName.lastIndexOf('.')).toLowerCase() : '',
    };

    const tutorial = Tutorial.create({
      userId,
      title,
      slug,
      description,
      hightlights,
      majorId,
      courseId,
      price,
      media,
      discountBundle,
      collectionId,
      resourceIds: finalResourceIds,
      collectionIds,
      steps,
      status: TutorialStatus.PENDING,
    });

    // Lưu tutorial vào DB trước khi xin presigned URL
    await this.tutorialRepository.save(tutorial);

    // 5. Gọi upload-service để lấy presigned URL qua RabbitMQ RPC
    let presignedUrlResponse: PresignedUrlRpcResponse;

    try {
      const event = new GetPresignedUrlEvent(
        {
          file: {
            fileName: command.fileName,
            fileSizeBytes,
            mimeType: media.extension ? `video/${media.extension.replace('.', '')}` : 'video/mp4',
          },
          uploadType: UploadType.TUTORIAL,
          uploadedBy: userId,
          contentId: tutorial.id,
          contentType: ContentType.TUTORIAL,
        },
        command.correlationId,
      );

      presignedUrlResponse = await this.storageBrokerPublisher.getPresignedUrl(event);
    } catch (error: unknown) {
      // Rollback: xóa tutorial đã tạo vì RabbitMQ tèo hoặc Upload-service lỗi
      await this.tutorialRepository.delete(tutorial.id);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        `Failed to get presigned URL via Message Broker: ${errorMessage}`,
        500,
      );
    }

    await this.tutorialRepository.updateMedia(tutorial.id, {
      ...media,
      fileId: presignedUrlResponse.uploadUrl.fileId,
    });

    // 6.5 Sync to recommendation-service (fire-and-forget)
    this.recommendationSync.send({
      type: 'ITEM_UPSERT',
      itemId: tutorial.id,
      itemType: 'TUTORIAL',
      majorId,
      courseId,
      title,
      slug,
    });

    // 7. Return tutorial metadata + presigned URL + estimatedTime
    return {
      id: tutorial.id,
      userId,
      title,
      slug,
      description,
      majorId,
      courseId,
      price,
      status: TutorialStatus.PENDING,
      createdAt: tutorial.createdAt,
      // Presigned URL data
      fileId: presignedUrlResponse.uploadUrl.fileId,
      s3Key: presignedUrlResponse.uploadUrl.s3Key,
      uploadUrl: presignedUrlResponse.uploadUrl.uploadUrl,
      estimatedTime: presignedUrlResponse.uploadUrl.estimatedTime,
      // Metadata cho client
      fileName,
      fileSizeBytes,
    };
  }
}
