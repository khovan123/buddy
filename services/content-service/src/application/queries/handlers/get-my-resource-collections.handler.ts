import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ICollectionRepository } from '../../../domain/repositories/collection.repository.interface';
import { COLLECTION_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { CollectionType } from '../../../infrastructure/persistence/mongo/schemas/collection.schema';
import { GetMyResourceCollectionsQuery } from '../get-my-resource-collections.query';

@QueryHandler(GetMyResourceCollectionsQuery)
export class GetMyResourceCollectionsHandler implements IQueryHandler<GetMyResourceCollectionsQuery> {
  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: ICollectionRepository,

    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  async execute(query: GetMyResourceCollectionsQuery) {
    const result = await this.collectionRepository.findAvailableCollections({
      ...query,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      type: CollectionType.RESOURCE,
    });
    result.data = await this.userServicePublisher.enrichWithUploaders(result.data);
    return result;
  }
}
