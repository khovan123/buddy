import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CollectionType } from '../../../infrastructure/persistence/mongo/schemas/collection.schema';
import type { ICollectionRepository } from '../../../domain/repositories/collection.repository.interface';
import { COLLECTION_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetLibraryTutorialCollectionsQuery } from '../get-library-tutorial-collections.query';

/** CQRS Handler to execute get library tutorial collections query. */
@QueryHandler(GetLibraryTutorialCollectionsQuery)
export class GetLibraryTutorialCollectionsHandler implements IQueryHandler<GetLibraryTutorialCollectionsQuery> {
  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: ICollectionRepository,

    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  async execute(query: GetLibraryTutorialCollectionsQuery) {
    const { page, limit, search, userId } = query;
    const result = await this.collectionRepository.findAvailableCollections({
      page,
      limit,
      search,
      userId,
      type: CollectionType.TUTORIAL,
    });
    result.data = await this.userServicePublisher.enrichWithUploaders(result.data);
    return result;
  }
}
