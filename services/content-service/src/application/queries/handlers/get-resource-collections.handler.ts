import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ICollectionRepository } from '../../../domain/repositories/collection.repository.interface';
import { COLLECTION_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { CollectionType } from '../../../infrastructure/persistence/mongo/schemas/collection.schema';
import { GetResourceCollectionsQuery } from '../get-resource-collections.query';

/** CQRS Handler to execute get resource collections. */
@QueryHandler(GetResourceCollectionsQuery)
export class GetResourceCollectionsHandler implements IQueryHandler<GetResourceCollectionsQuery> {
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
  async execute(query: GetResourceCollectionsQuery) {
    const { page, limit, search, userId, courseId } = query;
    const result = await this.collectionRepository.findAvailableCollections({
      page: page ?? 1,
      limit: limit ?? 20,
      search,
      userId,
      courseId,
      type: CollectionType.RESOURCE,
    });
    result.data = await this.userServicePublisher.enrichWithUploaders(result.data);
    return result;
  }
}
