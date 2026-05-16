import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ICollectionRepository } from '../../../domain/repositories/collection.repository.interface';
import { COLLECTION_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { CollectionType } from '../../../infrastructure/persistence/mongo/schemas/collection.schema';
import { GetMyTutorialCollectionsQuery } from '../get-my-tutorial-collections.query';

@QueryHandler(GetMyTutorialCollectionsQuery)
export class GetMyTutorialCollectionsHandler implements IQueryHandler<GetMyTutorialCollectionsQuery> {
  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: ICollectionRepository,

    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  async execute(query: GetMyTutorialCollectionsQuery) {
    const result = await this.collectionRepository.findAvailableCollections({
      ...query,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      type: CollectionType.TUTORIAL,
    });
    result.data = await this.userServicePublisher.enrichWithUploaders(result.data);
    return result;
  }
}
