import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ICollectionRepository } from '../../../domain/repositories/collection.repository.interface';
import { COLLECTION_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetCollectionByIdQuery } from '../get-collection-by-id.query';

/** CQRS Handler to retrieve a collection by its MongoDB ObjectId. */
@QueryHandler(GetCollectionByIdQuery)
export class GetCollectionByIdHandler implements IQueryHandler<GetCollectionByIdQuery> {
  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: ICollectionRepository,
    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  async execute(query: GetCollectionByIdQuery) {
    const item = await this.collectionRepository.findByIdWithDetails(query.id);
    if (!item) return null;
    const enriched = await this.userServicePublisher.enrichWithUploaders([item]);
    return enriched[0];
  }
}
