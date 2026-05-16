import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TUTORIAL_REPOSITORY } from '../../../domain/repositories/tokens';
import type { ITutorialRepository } from '../../../domain/repositories/tutorial.repository.interface';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetUncollectedTutorialsQuery } from '../get-uncollected-tutorials.query';

/** CQRS Handler: returns tutorials for a given course that are NOT in any collection. */
@QueryHandler(GetUncollectedTutorialsQuery)
export class GetUncollectedTutorialsHandler implements IQueryHandler<GetUncollectedTutorialsQuery> {
  constructor(
    @Inject(TUTORIAL_REPOSITORY)
    private readonly tutorialRepository: ITutorialRepository,

    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  async execute(query: GetUncollectedTutorialsQuery) {
    const { courseId, limit } = query;
    const items = await this.tutorialRepository.findUncollectedTutorials(courseId, limit);
    return this.userServicePublisher.enrichWithUploaders(items);
  }
}
