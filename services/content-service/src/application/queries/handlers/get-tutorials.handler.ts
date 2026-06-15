import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TUTORIAL_REPOSITORY } from '../../../domain/repositories/tokens';
import type { ITutorialRepository } from '../../../domain/repositories/tutorial.repository.interface';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';

import { GetTutorialsQuery } from '../get-tutorials.query';

/** CQRS Handler to execute  get tutorials. */
@QueryHandler(GetTutorialsQuery)
export class GetTutorialsHandler implements IQueryHandler<GetTutorialsQuery> {
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
  async execute(query: GetTutorialsQuery) {
    const { page, limit, search, userId, semester, majorId, price, verified, sort } = query;
    const result = await this.tutorialRepository.findAvailableTutorials({
      page,
      limit,
      search,
      userId,
      semester,
      majorId,
      price,
      verified,
      sort,
    });
    result.data = await this.userServicePublisher.enrichWithUploaders(result.data);
    return result;
  }
}
