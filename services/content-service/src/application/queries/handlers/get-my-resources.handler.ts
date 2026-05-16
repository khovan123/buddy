import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetMyResourcesQuery } from '../get-my-resources.query';

/** CQRS Handler to execute get my resources. */
@QueryHandler(GetMyResourcesQuery)
export class GetMyResourcesHandler implements IQueryHandler<GetMyResourcesQuery> {
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
  async execute(query: GetMyResourcesQuery) {
    const { page, limit, search, userId } = query;
    const result = await this.resourceRepository.findMyResources({ page, limit, search, userId });
    result.data = await this.userServicePublisher.enrichWithUploaders(result.data);
    return result;
  }
}
