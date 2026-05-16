import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetLibraryResourcesQuery } from '../get-library-resources.query';

/** CQRS Handler to execute get library resources. */
@QueryHandler(GetLibraryResourcesQuery)
export class GetLibraryResourcesHandler implements IQueryHandler<GetLibraryResourcesQuery> {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,

    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  async execute(query: GetLibraryResourcesQuery) {
    const { page, limit, search, userId } = query;
    const result = await this.resourceRepository.findAvailableResources({
      page,
      limit,
      search,
      userId,
    });
    result.data = await this.userServicePublisher.enrichWithUploaders(result.data);
    return result;
  }
}
