import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TUTORIAL_REPOSITORY } from '../../../domain/repositories/tokens';
import type { ITutorialRepository } from '../../../domain/repositories/tutorial.repository.interface';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetTopTutorialsQuery } from '../get-top-tutorials.query';

/** CQRS Handler to execute  get top tutorials. */
@QueryHandler(GetTopTutorialsQuery)
export class GetTopTutorialsHandler implements IQueryHandler<GetTopTutorialsQuery> {
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
  async execute(query: GetTopTutorialsQuery) {
    const items = await this.tutorialRepository.findTopTutorials(
      query.limit,
      query.search,
      query.semester,
      query.majorId,
    );
    return this.userServicePublisher.enrichWithUploaders(items);
  }
}
