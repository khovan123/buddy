import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetResourcesQuery } from '../get-resources.query';

/** CQRS Handler to execute  get resources. */
@QueryHandler(GetResourcesQuery)
export class GetResourcesHandler implements IQueryHandler<GetResourcesQuery> {
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
  async execute(query: GetResourcesQuery) {
    const { page, limit, search, userId, semester, majorId, courseId, price, verified, sort } =
      query;
    const result = await this.resourceRepository.findAvailableResources({
      page,
      limit,
      search,
      userId,
      semester,
      majorId,
      courseId,
      price,
      verified,
      sort,
    });
    const uploader = await this.userServicePublisher.enrichWithUploaders(result.data);
    result.data = uploader;
    return result;
  }
}
