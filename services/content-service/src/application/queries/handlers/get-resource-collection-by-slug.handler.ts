import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ICollectionRepository } from '../../../domain/repositories/collection.repository.interface';
import { COLLECTION_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { CollectionType } from '../../../infrastructure/persistence/mongo/schemas/collection.schema';
import { GetResourceCollectionBySlugQuery } from '../get-resource-collection-by-slug.query';

@QueryHandler(GetResourceCollectionBySlugQuery)
export class GetResourceCollectionBySlugHandler implements IQueryHandler<GetResourceCollectionBySlugQuery> {
  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: ICollectionRepository,

    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  async execute(query: GetResourceCollectionBySlugQuery) {
    const { slug } = query;
    const collection = await this.collectionRepository.findBySlugWithDetails(slug);
    if (!collection) return null;
    if (collection.type !== CollectionType.RESOURCE) return null;
    const enriched = await this.userServicePublisher.enrichWithUploaders([collection]);
    return enriched[0];
  }
}
