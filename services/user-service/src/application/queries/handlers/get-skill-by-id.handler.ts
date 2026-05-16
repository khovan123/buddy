import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IHighlightSkillRepository } from '../../../domain/repositories/highlight-skill.repository.interface';
import { HIGHLIGHT_SKILL_REPOSITORY } from '../../../domain/repositories/tokens';
import { GetSkillByIdQuery } from '../get-by-id.query';

@QueryHandler(GetSkillByIdQuery)
export class GetSkillByIdHandler implements IQueryHandler<GetSkillByIdQuery> {
  constructor(
    @Inject(HIGHLIGHT_SKILL_REPOSITORY) private readonly repo: IHighlightSkillRepository,
  ) {}

  async execute(query: GetSkillByIdQuery) {
    return this.repo.findById(query.id);
  }
}
