import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CAREER_REPOSITORY } from '../../../domain/repositories/tokens';
import type { ICareerRepository } from '../../../domain/repositories/career.repository.interface';
import { GetCareerByIdQuery } from '../get-by-id.query';

@QueryHandler(GetCareerByIdQuery)
export class GetCareerByIdHandler implements IQueryHandler<GetCareerByIdQuery> {
  constructor(@Inject(CAREER_REPOSITORY) private readonly repo: ICareerRepository) {}

  async execute(query: GetCareerByIdQuery) {
    return this.repo.findById(query.id);
  }
}
