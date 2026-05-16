import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { IHighlightSkillRepository } from '../../../domain/repositories/highlight-skill.repository.interface';
import { HIGHLIGHT_SKILL_REPOSITORY } from '../../../domain/repositories/tokens';
import { DeleteSkillCommand } from '../delete-skill.command';

@CommandHandler(DeleteSkillCommand)
export class DeleteSkillHandler implements ICommandHandler<DeleteSkillCommand> {
  constructor(
    @Inject(HIGHLIGHT_SKILL_REPOSITORY) private readonly repo: IHighlightSkillRepository,
  ) {}

  async execute(command: DeleteSkillCommand) {
    const existing = await this.repo.findById(command.id);
    if (!existing) {
      throw new NotFoundException(`Skill with ID ${command.id} not found`);
    }
    await this.repo.delete(command.id);
  }
}
