import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TUTORIAL_REPOSITORY } from '../../../domain/repositories/tokens';
import type { ITutorialRepository } from '../../../domain/repositories/tutorial.repository.interface';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetTutorialsByUserQuery } from '../get-tutorials-by-user.query';

/** CQRS Handler to execute get tutorials by user. */
@QueryHandler(GetTutorialsByUserQuery)
export class GetTutorialsByUserHandler implements IQueryHandler<GetTutorialsByUserQuery> {
  constructor(
    @Inject(TUTORIAL_REPOSITORY)
    private readonly tutorialRepository: ITutorialRepository,

    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  async execute(query: GetTutorialsByUserQuery) {
    const { page, limit, search, userId } = query;
    const result = await this.tutorialRepository.findAvailableTutorials({
      page,
      limit,
      search,
      userId,
    });
    result.data = await this.userServicePublisher.enrichWithUploaders(result.data);
    return result;
  }
}
