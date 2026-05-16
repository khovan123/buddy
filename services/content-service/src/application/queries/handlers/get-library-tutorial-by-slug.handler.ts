import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ITutorialRepository } from '../../../domain/repositories/tutorial.repository.interface';
import { TUTORIAL_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetLibraryTutorialBySlugQuery } from '../get-library-tutorial-by-slug.query';

/** CQRS Handler to execute get library tutorial by slug. */
@QueryHandler(GetLibraryTutorialBySlugQuery)
export class GetLibraryTutorialBySlugHandler implements IQueryHandler<GetLibraryTutorialBySlugQuery> {
  constructor(
    @Inject(TUTORIAL_REPOSITORY)
    private readonly tutorialRepository: ITutorialRepository,

    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  async execute(query: GetLibraryTutorialBySlugQuery) {
    const { slug } = query;
    const item = await this.tutorialRepository.findBySlugWithDetails(slug);
    if (!item) return null;
    const enriched = await this.userServicePublisher.enrichWithUploaders([item]);
    return enriched[0];
  }
}
