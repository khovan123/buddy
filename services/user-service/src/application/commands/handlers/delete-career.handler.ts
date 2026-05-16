import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CAREER_REPOSITORY } from '../../../domain/repositories/tokens';
import type { ICareerRepository } from '../../../domain/repositories/career.repository.interface';
import { DeleteCareerCommand } from '../delete-career.command';

@CommandHandler(DeleteCareerCommand)
export class DeleteCareerHandler implements ICommandHandler<DeleteCareerCommand> {
  constructor(@Inject(CAREER_REPOSITORY) private readonly repo: ICareerRepository) {}

  async execute(command: DeleteCareerCommand) {
    const existing = await this.repo.findById(command.id);
    if (!existing) {
      throw new NotFoundException(`Career with ID ${command.id} not found`);
    }
    await this.repo.delete(command.id);
  }
}
