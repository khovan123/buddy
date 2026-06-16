import { UploadThumbnailEvent } from '@libs/contracts';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import type { ICollectionRepository } from '../../../domain/repositories/collection.repository.interface';
import { COLLECTION_REPOSITORY } from '../../../domain/repositories/tokens';
import { StorageBrokerPublisher } from '../../../infrastructure/messaging/publishers/storage-broker.rpc';
import { UpdateCollectionCommand } from '../update-collection.command';

@CommandHandler(UpdateCollectionCommand)
@Injectable()
export class UpdateCollectionHandler implements ICommandHandler<UpdateCollectionCommand> {
  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: ICollectionRepository,
    private readonly storageBrokerPublisher: StorageBrokerPublisher,
  ) {}

  async execute(command: UpdateCollectionCommand) {
    const collection = await this.collectionRepository.findByIdWithDetails(command.collectionId);
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }
    if (collection.userId !== command.requesterId) {
      throw new ForbiddenException('You can only update your own collections');
    }

    await this.collectionRepository.updateDetails(command.collectionId, {
      title: command.title,
      description: command.description,
      hightlights: command.hightlights,
      majorId: command.majorId,
      courseId: command.courseId,
      type: command.type,
      discount: command.discount,
      phases: command.phases,
      learningFit: command.learningFit,
    });

    if (command.thumbnailBase64) {
      await this.storageBrokerPublisher.emitThumbnailUpload(
        new UploadThumbnailEvent(
          {
            contentId: command.collectionId,
            contentType: 'collection',
            folder: 'thumbnails/collections',
            publicId: `collection-${command.collectionId}`,
            imageBase64: command.thumbnailBase64,
          },
          command.correlationId,
        ),
      );
    }

    return { success: true };
  }
}
