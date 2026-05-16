import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetResourcesByUserQuery } from '../get-resources-by-user.query';

/** CQRS Handler to execute get resources by user. */
@QueryHandler(GetResourcesByUserQuery)
export class GetResourcesByUserHandler implements IQueryHandler<GetResourcesByUserQuery> {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,

    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  async execute(query: GetResourcesByUserQuery) {
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
