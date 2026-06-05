import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import type { ITutorialRepository } from '../../../domain/repositories/tutorial.repository.interface';
import { TUTORIAL_REPOSITORY } from '../../../domain/repositories/tokens';
import { UpdateTutorialCommand } from '../update-tutorial.command';

@CommandHandler(UpdateTutorialCommand)
@Injectable()
export class UpdateTutorialHandler implements ICommandHandler<UpdateTutorialCommand> {
  constructor(
    @Inject(TUTORIAL_REPOSITORY)
    private readonly tutorialRepository: ITutorialRepository,
  ) {}

  async execute(command: UpdateTutorialCommand) {
    const tutorial = await this.tutorialRepository.findByIdWithDetails(command.tutorialId);
    if (!tutorial) {
      throw new NotFoundException('Tutorial not found');
    }
    if (tutorial.userId !== command.requesterId) {
      throw new ForbiddenException('You can only update your own tutorials');
    }

    await this.tutorialRepository.updateDetails(command.tutorialId, {
      title: command.title,
      description: command.description,
      hightlights: command.hightlights,
      majorId: command.majorId,
      courseId: command.courseId,
      price: command.price,
      discountBundle: command.discountBundle,
      collectionId: command.collectionId,
      steps: command.steps,
    });

    return { success: true };
  }
}
