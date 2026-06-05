import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../../../domain/repositories/tokens';
import { DeleteResourceCommand } from '../delete-resource.command';

@CommandHandler(DeleteResourceCommand)
@Injectable()
export class DeleteResourceHandler implements ICommandHandler<DeleteResourceCommand> {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,
  ) {}

  async execute(command: DeleteResourceCommand): Promise<{ success: boolean }> {
    const resource = await this.resourceRepository.findByIdWithDetails(command.resourceId);
    if (!resource) {
      throw new NotFoundException('Resource not found');
    }
    if (resource.userId !== command.requesterId) {
      throw new ForbiddenException('You can only delete your own resources');
    }

    await this.resourceRepository.softDelete(command.resourceId);
    return { success: true };
  }
}
