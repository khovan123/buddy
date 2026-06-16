import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IContentAccessRepository } from '../../../domain/repositories/content-access.repository.interfaces';
import { CONTENT_ACCESS_REPOSITORY } from '../../../domain/repositories/tokens';
import { CheckAccessQuery } from '../check-access.query';

@QueryHandler(CheckAccessQuery)
export class CheckAccessHandler implements IQueryHandler<CheckAccessQuery> {
  constructor(
    @Inject(CONTENT_ACCESS_REPOSITORY)
    private readonly contentAccessRepository: IContentAccessRepository,
  ) {}

  async execute(query: CheckAccessQuery): Promise<boolean> {
    return this.contentAccessRepository.hasAccess(query.userId, query.resourceId);
  }
}
