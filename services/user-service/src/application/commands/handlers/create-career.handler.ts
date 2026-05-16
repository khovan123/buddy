import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CAREER_REPOSITORY } from '../../../domain/repositories/tokens';
import type { ICareerRepository } from '../../../domain/repositories/career.repository.interface';
import { CreateCareerCommand } from '../create-career.command';

@CommandHandler(CreateCareerCommand)
export class CreateCareerHandler implements ICommandHandler<CreateCareerCommand> {
  constructor(@Inject(CAREER_REPOSITORY) private readonly repo: ICareerRepository) {}

  async execute(command: CreateCareerCommand) {
    return this.repo.create({
      name: command.name,
      description: command.description,
    });
  }
}
