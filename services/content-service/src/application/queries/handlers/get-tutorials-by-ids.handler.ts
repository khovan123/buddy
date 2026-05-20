import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TUTORIAL_REPOSITORY } from '../../../domain/repositories/tokens';
import type { ITutorialRepository } from '../../../domain/repositories/tutorial.repository.interface';
import { GetTutorialsByIdsQuery } from '../get-tutorials-by-ids.query';

/** CQRS Handler to retrieve multiple tutorials by their MongoDB ObjectIds. */
@QueryHandler(GetTutorialsByIdsQuery)
export class GetTutorialsByIdsHandler implements IQueryHandler<GetTutorialsByIdsQuery> {
  constructor(
    @Inject(TUTORIAL_REPOSITORY)
    private readonly tutorialRepository: ITutorialRepository,
  ) {}

  async execute(query: GetTutorialsByIdsQuery) {
    const items = await this.tutorialRepository.findByIdsWithDetails(query.ids);
    if (!items || items.length === 0) return [];
    return items;
  }
}
