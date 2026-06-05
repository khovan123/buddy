import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import type { ITutorialRepository } from '../../../domain/repositories/tutorial.repository.interface';
import { TUTORIAL_REPOSITORY } from '../../../domain/repositories/tokens';
import { DeleteTutorialCommand } from '../delete-tutorial.command';

@CommandHandler(DeleteTutorialCommand)
@Injectable()
export class DeleteTutorialHandler implements ICommandHandler<DeleteTutorialCommand> {
  constructor(
    @Inject(TUTORIAL_REPOSITORY)
    private readonly tutorialRepository: ITutorialRepository,
  ) {}

  async execute(command: DeleteTutorialCommand): Promise<{ success: boolean }> {
    const tutorial = await this.tutorialRepository.findByIdWithDetails(command.tutorialId);
    if (!tutorial) {
      throw new NotFoundException('Tutorial not found');
    }
    if (tutorial.userId !== command.requesterId) {
      throw new ForbiddenException('You can only delete your own tutorials');
    }

    await this.tutorialRepository.softDelete(command.tutorialId);
    return { success: true };
  }
}
