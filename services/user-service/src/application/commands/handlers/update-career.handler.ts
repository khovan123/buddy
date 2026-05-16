import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CAREER_REPOSITORY } from '../../../domain/repositories/tokens';
import type { ICareerRepository } from '../../../domain/repositories/career.repository.interface';
import { UpdateCareerCommand } from '../update-career.command';

@CommandHandler(UpdateCareerCommand)
export class UpdateCareerHandler implements ICommandHandler<UpdateCareerCommand> {
  constructor(@Inject(CAREER_REPOSITORY) private readonly repo: ICareerRepository) {}

  async execute(command: UpdateCareerCommand) {
    const updated = await this.repo.update(command.id, {
      name: command.name,
      description: command.description,
      status: command.status,
    });

    if (!updated) {
      throw new NotFoundException(`Career with ID ${command.id} not found`);
    }

    return updated;
  }
}
