import { AppLogger } from '@libs/common';
import { GetPreviewUrlEvent } from '@libs/contracts';
import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../../../domain/repositories/tokens';
import { StorageBrokerPublisher } from '../../../infrastructure/messaging/publishers/storage-broker.rpc';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetLibraryResourceBySlugQuery } from '../get-library-resource-by-slug.query';

/** CQRS Handler to execute get library resource by slug. */
@QueryHandler(GetLibraryResourceBySlugQuery)
export class GetLibraryResourceBySlugHandler implements IQueryHandler<GetLibraryResourceBySlugQuery> {
  private readonly logger = new AppLogger(GetLibraryResourceBySlugHandler.name);

  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,

    private readonly userServicePublisher: UserServicePublisher,
    private readonly storageBrokerPublisher: StorageBrokerPublisher,
  ) {}

  async execute(query: GetLibraryResourceBySlugQuery) {
    const { slug } = query;
    const item = await this.resourceRepository.findBySlugWithDetails(slug);
    if (!item) return null;
    await this.refreshPrimaryDownloadUrl(item);
    const enriched = await this.userServicePublisher.enrichWithUploaders([item]);
    return enriched[0];
  }

  private async refreshPrimaryDownloadUrl(
    item: Awaited<ReturnType<IResourceRepository['findBySlugWithDetails']>>,
  ): Promise<void> {
    if (!item?.primaryS3Key || !item.meta?.[0]) {
      return;
    }

    try {
      const response = await this.storageBrokerPublisher.getPreviewUrl(
        new GetPreviewUrlEvent({
          s3Key: item.primaryS3Key,
          fullAccess: true,
        }),
      );

      if (response.previewUrl && response.isPreview === false) {
        item.meta[0].downloadUrl = response.previewUrl;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to refresh library resource download URL for ${item.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
