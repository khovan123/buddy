import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ICollectionRepository } from '../../../domain/repositories/collection.repository.interface';
import { COLLECTION_REPOSITORY } from '../../../domain/repositories/tokens';
import { GetCollectionsByIdsQuery } from '../get-collections-by-ids.query';

/** CQRS Handler to retrieve multiple collections by their MongoDB ObjectIds. */
@QueryHandler(GetCollectionsByIdsQuery)
export class GetCollectionsByIdsHandler implements IQueryHandler<GetCollectionsByIdsQuery> {
  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: ICollectionRepository,
  ) {}

  async execute(query: GetCollectionsByIdsQuery) {
    const items = await this.collectionRepository.findByIdsWithDetails(query.ids);
    if (!items || items.length === 0) return [];
    return items;
  }
}
