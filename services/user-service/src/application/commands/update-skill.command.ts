import { HighlightSkillStatus } from '../../domain/entities/highlight-skill.entity';

export class UpdateSkillCommand {
  constructor(
    public readonly id: string,
    public readonly name?: string,
    public readonly careerId?: string,
    public readonly status?: HighlightSkillStatus,
  ) {}
}
