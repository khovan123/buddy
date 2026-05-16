import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { IHighlightSkillRepository } from '../../../domain/repositories/highlight-skill.repository.interface';
import { HIGHLIGHT_SKILL_REPOSITORY } from '../../../domain/repositories/tokens';
import { UpdateSkillCommand } from '../update-skill.command';

@CommandHandler(UpdateSkillCommand)
export class UpdateSkillHandler implements ICommandHandler<UpdateSkillCommand> {
  constructor(
    @Inject(HIGHLIGHT_SKILL_REPOSITORY) private readonly repo: IHighlightSkillRepository,
  ) {}

  async execute(command: UpdateSkillCommand) {
    const updated = await this.repo.update(command.id, {
      name: command.name,
      careerId: command.careerId,
      status: command.status,
    });

    if (!updated) {
      throw new NotFoundException(`Skill with ID ${command.id} not found`);
    }

    return updated;
  }
}
