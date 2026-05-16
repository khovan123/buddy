import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TUTORIAL_REPOSITORY } from '../../../domain/repositories/tokens';
import type { ITutorialRepository } from '../../../domain/repositories/tutorial.repository.interface';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetMyTutorialsQuery } from '../get-my-tutorials.query';

/** CQRS Handler to execute get my tutorials. */
@QueryHandler(GetMyTutorialsQuery)
export class GetMyTutorialsHandler implements IQueryHandler<GetMyTutorialsQuery> {
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
  async execute(query: GetMyTutorialsQuery) {
    const { page, limit, search, userId } = query;
    const result = await this.tutorialRepository.findMyTutorials({ page, limit, search, userId });
    result.data = await this.userServicePublisher.enrichWithUploaders(result.data);
    return result;
  }
}
