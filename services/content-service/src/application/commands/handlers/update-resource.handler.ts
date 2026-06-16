import { UploadThumbnailEvent } from '@libs/contracts';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../../../domain/repositories/tokens';
import { StorageBrokerPublisher } from '../../../infrastructure/messaging/publishers/storage-broker.rpc';
import { UpdateResourceCommand } from '../update-resource.command';

@CommandHandler(UpdateResourceCommand)
@Injectable()
export class UpdateResourceHandler implements ICommandHandler<UpdateResourceCommand> {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,
    private readonly storageBrokerPublisher: StorageBrokerPublisher,
  ) {}

  async execute(command: UpdateResourceCommand) {
    const resource = await this.resourceRepository.findByIdWithDetails(command.resourceId);
    if (!resource) {
      throw new NotFoundException('Resource not found');
    }
    if (resource.userId !== command.requesterId) {
      throw new ForbiddenException('You can only update your own resources');
    }

    await this.resourceRepository.updateDetails(command.resourceId, {
      title: command.title,
      summary: command.summary,
      hightlights: command.hightlights,
      majorId: command.majorId,
      courseId: command.courseId,
      price: command.price,
      collectionId: command.collectionId,
      learningFit: command.learningFit,
    });

    if (command.thumbnailBase64) {
      await this.storageBrokerPublisher.emitThumbnailUpload(
        new UploadThumbnailEvent(
          {
            contentId: command.resourceId,
            contentType: 'resource',
            folder: 'resources',
            publicId: `resource-${command.resourceId}`,
            imageBase64: command.thumbnailBase64,
          },
          command.correlationId,
        ),
      );
    }

    return { success: true };
  }
}
