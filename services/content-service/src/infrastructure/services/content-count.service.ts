import { Inject, Injectable } from '@nestjs/common';
import type { IResourceRepository } from '../../domain/repositories/resource.repository.interface';
import type { ITutorialRepository } from '../../domain/repositories/tutorial.repository.interface';
import type { ICollectionRepository } from '../../domain/repositories/collection.repository.interface';
import {
  COLLECTION_REPOSITORY,
  RESOURCE_REPOSITORY,
  TUTORIAL_REPOSITORY,
} from '../../domain/repositories/tokens';

/**
 * Lightweight service for counting user content. Used by PBAC limit policies.
 * Delegates to existing repositories, keeping counts consistent with query logic.
 */
@Injectable()
export class ContentCountService {
  constructor(
    @Inject(RESOURCE_REPOSITORY) private readonly resourceRepo: IResourceRepository,
    @Inject(TUTORIAL_REPOSITORY) private readonly tutorialRepo: ITutorialRepository,
    @Inject(COLLECTION_REPOSITORY) private readonly collectionRepo: ICollectionRepository,
  ) {}

  async countResources(userId: string): Promise<number> {
    const result = await this.resourceRepo.findMyResources({ page: 1, limit: 1, userId });
    return result.meta.total;
  }

  async countTutorials(userId: string): Promise<number> {
    const result = await this.tutorialRepo.findMyTutorials({ page: 1, limit: 1, userId });
    return result.meta.total;
  }

  async countCollections(userId: string): Promise<number> {
    const result = await this.collectionRepo.findAvailableCollections({
      page: 1,
      limit: 1,
      userId,
    });
    return result.meta.total;
  }
}
