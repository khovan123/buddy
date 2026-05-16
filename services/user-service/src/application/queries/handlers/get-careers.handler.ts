import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CAREER_REPOSITORY } from '../../../domain/repositories/tokens';
import type { ICareerRepository } from '../../../domain/repositories/career.repository.interface';
import { GetCareersQuery } from '../get-careers.query';

/** CQRS Handler to execute get careers. */
@QueryHandler(GetCareersQuery)
export class GetCareersHandler implements IQueryHandler<GetCareersQuery> {
  constructor(@Inject(CAREER_REPOSITORY) private readonly repo: ICareerRepository) {}

  /**
   * Executes the query logic.
   *
   * @param query - The query parameter
   */
  async execute(query: GetCareersQuery) {
    return this.repo.findAll(query.page, query.limit, query.search);
  }
}
