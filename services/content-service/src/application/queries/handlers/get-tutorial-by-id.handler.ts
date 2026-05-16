import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TUTORIAL_REPOSITORY } from '../../../domain/repositories/tokens';
import type { ITutorialRepository } from '../../../domain/repositories/tutorial.repository.interface';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetTutorialByIdQuery } from '../get-tutorial-by-id.query';

/** CQRS Handler to retrieve a tutorial by its MongoDB ObjectId. */
@QueryHandler(GetTutorialByIdQuery)
export class GetTutorialByIdHandler implements IQueryHandler<GetTutorialByIdQuery> {
  constructor(
    @Inject(TUTORIAL_REPOSITORY)
    private readonly tutorialRepository: ITutorialRepository,
    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  async execute(query: GetTutorialByIdQuery) {
    const item = await this.tutorialRepository.findByIdWithDetails(query.id);
    if (!item) return null;
    const enriched = await this.userServicePublisher.enrichWithUploaders([item]);
    return enriched[0];
  }
}
