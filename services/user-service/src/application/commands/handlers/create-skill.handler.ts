import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { IHighlightSkillRepository } from '../../../domain/repositories/highlight-skill.repository.interface';
import { HIGHLIGHT_SKILL_REPOSITORY } from '../../../domain/repositories/tokens';
import { CreateSkillCommand } from '../create-skill.command';

@CommandHandler(CreateSkillCommand)
export class CreateSkillHandler implements ICommandHandler<CreateSkillCommand> {
  constructor(
    @Inject(HIGHLIGHT_SKILL_REPOSITORY) private readonly repo: IHighlightSkillRepository,
  ) {}

  async execute(command: CreateSkillCommand) {
    return this.repo.create({
      name: command.name,
      careerId: command.careerId,
    });
  }
}
