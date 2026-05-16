import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetResourceBySlugQuery } from '../get-resource-by-slug.query';

/** CQRS Handler to execute  get resource by slug. */
@QueryHandler(GetResourceBySlugQuery)
export class GetResourceBySlugHandler implements IQueryHandler<GetResourceBySlugQuery> {
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
  async execute(query: GetResourceBySlugQuery) {
    const { slug } = query;
    const item = await this.resourceRepository.findBySlugWithDetails(slug);
    if (!item) return null;
    const enriched = await this.userServicePublisher.enrichWithUploaders([item]);
    return enriched[0];
  }
}
