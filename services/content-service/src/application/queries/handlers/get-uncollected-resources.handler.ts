import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetUncollectedResourcesQuery } from '../get-uncollected-resources.query';

/** CQRS Handler: returns resources for a given course that are NOT in any collection. */
@QueryHandler(GetUncollectedResourcesQuery)
export class GetUncollectedResourcesHandler implements IQueryHandler<GetUncollectedResourcesQuery> {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,

    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  async execute(query: GetUncollectedResourcesQuery) {
    const { courseId, limit } = query;
    const items = await this.resourceRepository.findUncollectedResources(courseId, limit);
    return this.userServicePublisher.enrichWithUploaders(items);
  }
}
