import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ICollectionRepository } from '../../../domain/repositories/collection.repository.interface';
import { COLLECTION_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { CollectionType } from '../../../infrastructure/persistence/mongo/schemas/collection.schema';
import { GetTopTutorialCollectionsQuery } from '../get-top-tutorial-collections.query';

/** CQRS Handler to execute  get top tutorial collections. */
@QueryHandler(GetTopTutorialCollectionsQuery)
export class GetTopTutorialCollectionsHandler implements IQueryHandler<GetTopTutorialCollectionsQuery> {
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
  async execute(query: GetTopTutorialCollectionsQuery) {
    const items = await this.collectionRepository.findTopCollections(
      query.limit,
      CollectionType.TUTORIAL,
      query.search,
      query.semester,
      query.majorId,
    );
    return this.userServicePublisher.enrichWithUploaders(items);
  }
}
