import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ICollectionRepository } from '../../../domain/repositories/collection.repository.interface';
import { COLLECTION_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetLibraryResourceCollectionBySlugQuery } from '../get-library-resource-collection-by-slug.query';

/** CQRS Handler to execute get library resource collection by slug. */
@QueryHandler(GetLibraryResourceCollectionBySlugQuery)
export class GetLibraryResourceCollectionBySlugHandler implements IQueryHandler<GetLibraryResourceCollectionBySlugQuery> {
  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: ICollectionRepository,

    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  async execute(query: GetLibraryResourceCollectionBySlugQuery) {
    const { slug } = query;
    const collection = await this.collectionRepository.findBySlugWithDetails(slug);
    if (!collection || collection.type !== 'RESOURCE') return null;
    const enriched = await this.userServicePublisher.enrichWithUploaders([collection]);
    return enriched[0];
  }
}
