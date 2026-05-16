import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetResourcesByIdsQuery } from '../get-resources-by-ids.query';

/** CQRS Handler to retrieve multiple resources by their MongoDB ObjectIds. */
@QueryHandler(GetResourcesByIdsQuery)
export class GetResourcesByIdsHandler implements IQueryHandler<GetResourcesByIdsQuery> {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,
    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  async execute(query: GetResourcesByIdsQuery) {
    const items = await this.resourceRepository.findByIdsWithDetails(query.ids);
    if (!items || items.length === 0) return [];
    const enriched = await this.userServicePublisher.enrichWithUploaders(items);
    return enriched;
  }
}
