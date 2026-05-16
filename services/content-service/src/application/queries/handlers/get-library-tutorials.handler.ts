import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ITutorialRepository } from '../../../domain/repositories/tutorial.repository.interface';
import { TUTORIAL_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetLibraryTutorialsQuery } from '../get-library-tutorials.query';

/** CQRS Handler to execute get library tutorials. */
@QueryHandler(GetLibraryTutorialsQuery)
export class GetLibraryTutorialsHandler implements IQueryHandler<GetLibraryTutorialsQuery> {
  constructor(
    @Inject(TUTORIAL_REPOSITORY)
    private readonly tutorialRepository: ITutorialRepository,

    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  async execute(query: GetLibraryTutorialsQuery) {
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
