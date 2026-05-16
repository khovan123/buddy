import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ICollectionRepository } from '../../../domain/repositories/collection.repository.interface';
import { COLLECTION_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { CollectionType } from '../../../infrastructure/persistence/mongo/schemas/collection.schema';
import { GetTopResourceCollectionsQuery } from '../get-top-resource-collections.query';

/** CQRS Handler to execute  get top resource collections. */
@QueryHandler(GetTopResourceCollectionsQuery)
export class GetTopResourceCollectionsHandler implements IQueryHandler<GetTopResourceCollectionsQuery> {
  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: ICollectionRepository,

    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param query - The query parameter
   */
  async execute(query: GetTopResourceCollectionsQuery) {
    const items = await this.collectionRepository.findTopCollections(
      query.limit,
      CollectionType.RESOURCE,
      query.search,
      query.semester,
      query.majorId,
    );
    return this.userServicePublisher.enrichWithUploaders(items);
  }
}
