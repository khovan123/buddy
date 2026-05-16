import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ICollectionRepository } from '../../../domain/repositories/collection.repository.interface';
import { COLLECTION_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetLibraryTutorialCollectionBySlugQuery } from '../get-library-tutorial-collection-by-slug.query';

/** CQRS Handler to execute get library tutorial collection by slug. */
@QueryHandler(GetLibraryTutorialCollectionBySlugQuery)
export class GetLibraryTutorialCollectionBySlugHandler implements IQueryHandler<GetLibraryTutorialCollectionBySlugQuery> {
  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: ICollectionRepository,

    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  async execute(query: GetLibraryTutorialCollectionBySlugQuery) {
    const { slug } = query;
    const collection = await this.collectionRepository.findBySlugWithDetails(slug);
    if (!collection || collection.type !== 'TUTORIAL') return null;
    const enriched = await this.userServicePublisher.enrichWithUploaders([collection]);
    return enriched[0];
  }
}
