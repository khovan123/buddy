import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CollectionType } from '../../../infrastructure/persistence/mongo/schemas/collection.schema';
import type { ICollectionRepository } from '../../../domain/repositories/collection.repository.interface';
import { COLLECTION_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetLibraryResourceCollectionsQuery } from '../get-library-resource-collections.query';

/** CQRS Handler to execute get library resource collections query. */
@QueryHandler(GetLibraryResourceCollectionsQuery)
export class GetLibraryResourceCollectionsHandler implements IQueryHandler<GetLibraryResourceCollectionsQuery> {
  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: ICollectionRepository,

    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  async execute(query: GetLibraryResourceCollectionsQuery) {
    const { page, limit, search, userId } = query;
    const result = await this.collectionRepository.findAvailableCollections({
      page,
      limit,
      search,
      userId,
      type: CollectionType.RESOURCE,
    });
    result.data = await this.userServicePublisher.enrichWithUploaders(result.data);
    return result;
  }
}
