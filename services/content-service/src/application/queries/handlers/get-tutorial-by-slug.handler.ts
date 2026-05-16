import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TUTORIAL_REPOSITORY } from '../../../domain/repositories/tokens';
import type { ITutorialRepository } from '../../../domain/repositories/tutorial.repository.interface';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetTutorialBySlugQuery } from '../get-tutorial-by-slug.query';

/** CQRS Handler to execute  get tutorial by slug. */
@QueryHandler(GetTutorialBySlugQuery)
export class GetTutorialBySlugHandler implements IQueryHandler<GetTutorialBySlugQuery> {
  constructor(
    @Inject(TUTORIAL_REPOSITORY)
    private readonly tutorialRepository: ITutorialRepository,

    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param query - The query parameter
   */
  async execute(query: GetTutorialBySlugQuery) {
    const { slug } = query;
    const item = await this.tutorialRepository.findBySlugWithDetails(slug);
    if (!item) return null;
    const enriched = await this.userServicePublisher.enrichWithUploaders([item]);
    return enriched[0];
  }
}
