import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetLibraryResourceBySlugQuery } from '../get-library-resource-by-slug.query';

/** CQRS Handler to execute get library resource by slug. */
@QueryHandler(GetLibraryResourceBySlugQuery)
export class GetLibraryResourceBySlugHandler implements IQueryHandler<GetLibraryResourceBySlugQuery> {
  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,

    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  async execute(query: GetLibraryResourceBySlugQuery) {
    const { slug } = query;
    const item = await this.resourceRepository.findBySlugWithDetails(slug);
    if (!item) return null;
    const enriched = await this.userServicePublisher.enrichWithUploaders([item]);
    return enriched[0];
  }
}
