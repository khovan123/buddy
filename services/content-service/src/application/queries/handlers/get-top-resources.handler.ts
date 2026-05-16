import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetTopResourcesQuery } from '../get-top-resources.query';

/** CQRS Handler to execute  get top resources. */
@QueryHandler(GetTopResourcesQuery)
export class GetTopResourcesHandler implements IQueryHandler<GetTopResourcesQuery> {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,

    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param query - The query parameter
   */
  async execute(query: GetTopResourcesQuery) {
    const items = await this.resourceRepository.findTopResources(
      query.limit,
      query.search,
      query.semester,
      query.majorId,
    );
    return this.userServicePublisher.enrichWithUploaders(items);
  }
}
