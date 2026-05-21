import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import slugify from 'slugify';

import { UploadThumbnailEvent } from '@libs/contracts';

import { Collection } from '../../../domain/entities/collection.entity';
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
import {
  CollectionPhaseItemType,
  CollectionType,
} from '../../../infrastructure/persistence/mongo/schemas/collection.schema';
import { CreateCollectionCommand } from '../create-collection.command';

/** CQRS Handler to execute  create collection. */
@CommandHandler(CreateCollectionCommand)
export class CreateCollectionHandler implements ICommandHandler<CreateCollectionCommand> {
  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: ICollectionRepository,
    @Inject(CONTENT_VALIDATION_SERVICE)
    private readonly contentValidationService: IContentValidationService,
    @Inject(TUTORIAL_REPOSITORY)
    private readonly tutorialRepository: ITutorialRepository,
    private readonly storageBrokerPublisher: StorageBrokerPublisher,
    private readonly recommendationSync: RecommendationSyncPublisher,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param command - The command parameter
   */
  async execute(command: CreateCollectionCommand) {
    const {
      userId,
      title,
      description,
      hightlights,
      majorId,
      courseId,
      resourceIds,
      tutorialIds,
      thumbnailBase64,
      discount,
      type,
    } = command;

    // ── Type-Specific Validation & ID Derivation ───────────────────
    if (!command.phases || command.phases.length === 0) {
      throw new BadRequestException('Collection must contain at least one phase (roadmap section)');
    }

    let derivedTutorialIds: string[] = [];
    let derivedResourceIds: string[] = [];

    if (type === CollectionType.RESOURCE) {
      if (tutorialIds && tutorialIds.length > 0) {
        throw new BadRequestException(
          'Resource collection must not contain explicitly provided tutorialIds',
        );
      }

      // Auto-derive resourceIds from phases
      const ids = command.phases
        .flatMap((p) => p.items)
        .filter((item) => item.itemType === CollectionPhaseItemType.RESOURCE)
        .map((item) => item.itemId);

      // Deduplicate using Set as requested
      derivedResourceIds = Array.from(new Set(ids));

      if (derivedResourceIds.length === 0) {
        throw new BadRequestException(
          'Resource collection phases must contain at least one resource item',
        );
      }
    } else if (type === CollectionType.TUTORIAL) {
      if (resourceIds && resourceIds.length > 0) {
        throw new BadRequestException(
          'Tutorial collection must not contain explicitly provided resourceIds',
        );
      }

      // Auto-derive tutorialIds from phases
      const ids = command.phases
        .flatMap((p) => p.items)
        .filter((item) => item.itemType === CollectionPhaseItemType.TUTORIAL)
        .map((item) => item.itemId);

      // Deduplicate using Set
      derivedTutorialIds = Array.from(new Set(ids));

      if (derivedTutorialIds.length === 0) {
        throw new BadRequestException(
          'Tutorial collection phases must contain at least one tutorial item',
        );
      }
    }

    // 2. Validate title unique
    const existingCollection = await this.collectionRepository.findByTitle(title);
    if (existingCollection) {
      throw new BadRequestException('Collection title already exists');
    }

    // 3. Validate majorId và courseId tồn tại
    await this.contentValidationService.validateMajorExists(majorId);
    await this.contentValidationService.validateCourseExists(courseId, majorId);

    // 4. Validate resource integrity (RESOURCE type): all resources must share majorId & courseId
    if (type === CollectionType.RESOURCE && derivedResourceIds.length > 0) {
      await this.contentValidationService.validateTargetIntegrity({
        majorId,
        courseId,
        resourceIds: derivedResourceIds,
      });
    }

    // 5. Validate tutorial existence & availability
    if (derivedTutorialIds && derivedTutorialIds.length > 0) {
      const tutorials = await this.tutorialRepository.findByIds(derivedTutorialIds);
      if (tutorials.length !== derivedTutorialIds.length) {
        throw new BadRequestException('One or more tutorial IDs are invalid');
      }
      // Ensure none already belong to a collection
      const alreadyLinked = tutorials.filter((t) => t.collectionId);
      if (alreadyLinked.length > 0) {
        throw new BadRequestException(
          `Tutorials already in a collection: ${alreadyLinked.map((t) => t.title).join(', ')}`,
        );
      }
    }

    // 6. Generate SEO-friendly slug từ title
    const baseSlug = slugify(title, { lower: true, strict: true, locale: 'vi' });
    let slug = baseSlug;
    let counter = 1;

    // Đảm bảo slug unique
    while (await this.collectionRepository.findBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 7. Khởi tạo Entity và save
    const collection = Collection.create({
      userId,
      title,
      slug,
      description,
      hightlights,
      majorId,
      courseId,
      resourceIds: type === CollectionType.RESOURCE ? derivedResourceIds : [],
      type,
      discount,
      // Phases are now applied for both types
      phases: command.phases?.map((p) => ({
        phaseTitle: p.phaseTitle,
        learningGoal: p.learningGoal || '',
        items: p.items.map((item) => ({
          itemId: item.itemId,
          itemType: item.itemType,
        })),
      })),
    });

    await this.collectionRepository.save(collection);

    // 8. Link tutorials to the collection (TUTORIAL type only)
    if (type === CollectionType.TUTORIAL && derivedTutorialIds && derivedTutorialIds.length > 0) {
      await this.tutorialRepository.assignCollectionToTutorials(derivedTutorialIds, collection.id);
    }

    // 9. Emit async thumbnail upload event (fire-and-forget)
    if (thumbnailBase64) {
      try {
        console.log(
          `[CreateCollection] Emitting thumbnail upload event: ` +
            `collectionId=${collection.id}, base64Length=${thumbnailBase64.length}`,
        );
        const thumbnailEvent = new UploadThumbnailEvent(
          {
            imageBase64: thumbnailBase64,
            folder: 'thumbnails/collections',
            publicId: `collection-${collection.id}`,
            contentId: collection.id,
            contentType: 'collection',
          },
          command.correlationId,
        );
        await this.storageBrokerPublisher.emitThumbnailUpload(thumbnailEvent);
      } catch (error) {
        // Log but don't fail the whole creation — thumbnail is optional & async
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          `[CreateCollection] Failed to emit thumbnail upload event for collection ${collection.id}: ${errorMsg}`,
        );
      }
    }

    // 10. Sync to recommendation-service (fire-and-forget)
    this.recommendationSync.send({
      type: 'ITEM_UPSERT',
      itemId: collection.id,
      itemType: type === CollectionType.RESOURCE ? 'RESOURCE_COLLECTION' : 'TUTORIAL_COLLECTION',
      majorId,
      courseId,
      title,
      slug,
      description,
      hightlights,
    });

    return collection;
  }
}
