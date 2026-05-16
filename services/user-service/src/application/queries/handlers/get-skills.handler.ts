import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IHighlightSkillRepository } from '../../../domain/repositories/highlight-skill.repository.interface';
import { HIGHLIGHT_SKILL_REPOSITORY } from '../../../domain/repositories/tokens';
import { GetSkillsQuery } from '../get-skills.query';

/** CQRS Handler to execute get skills. */
@QueryHandler(GetSkillsQuery)
export class GetSkillsHandler implements IQueryHandler<GetSkillsQuery> {
  constructor(
    @Inject(HIGHLIGHT_SKILL_REPOSITORY) private readonly repo: IHighlightSkillRepository,
  ) {}

  /**
   * Executes the query logic.
   *
   * @param query - The query parameter
   */
  async execute(query: GetSkillsQuery) {
    return this.repo.findAll(query.page, query.limit, query.careerId);
  }
}
