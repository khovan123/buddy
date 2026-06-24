import { GetPreviewUrlEvent, GetUploadHistoryByContentEvent } from '@libs/contracts';
import { AppLogger } from '@libs/common';
import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ITutorialRepository } from '../../../domain/repositories/tutorial.repository.interface';
import { TUTORIAL_REPOSITORY } from '../../../domain/repositories/tokens';
import { StorageBrokerPublisher } from '../../../infrastructure/messaging/publishers/storage-broker.rpc';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetLibraryTutorialBySlugQuery } from '../get-library-tutorial-by-slug.query';

/** CQRS Handler to execute get library tutorial by slug. */
@QueryHandler(GetLibraryTutorialBySlugQuery)
export class GetLibraryTutorialBySlugHandler implements IQueryHandler<GetLibraryTutorialBySlugQuery> {
  private readonly logger = new AppLogger(GetLibraryTutorialBySlugHandler.name);

  constructor(
    @Inject(TUTORIAL_REPOSITORY)
    private readonly tutorialRepository: ITutorialRepository,

    private readonly userServicePublisher: UserServicePublisher,
    private readonly storageBrokerPublisher: StorageBrokerPublisher,
  ) {}

  async execute(query: GetLibraryTutorialBySlugQuery) {
    const { slug } = query;
    const item = await this.tutorialRepository.findBySlugWithDetails(slug);
    if (!item) return null;
    await this.refreshFullVideoUrl(item);
    const enriched = await this.userServicePublisher.enrichWithUploaders([item]);
    return enriched[0];
  }

  private async refreshFullVideoUrl(
    item: Awaited<ReturnType<ITutorialRepository['findBySlugWithDetails']>>,
  ) {
    if (!item?.media?.fileId) {
      return;
    }

    try {
      const histories = await this.storageBrokerPublisher.getUploadHistoryByContent(
        new GetUploadHistoryByContentEvent({ contentId: item.id }),
      );
      const mediaFile =
        histories.find((history) => history.id === item.media.fileId) ??
        histories.find((history) => history.contentType?.toUpperCase() === 'TUTORIAL') ??
        histories[0];

      if (!mediaFile?.s3Key) {
        return;
      }

      const response = await this.storageBrokerPublisher.getPreviewUrl(
        new GetPreviewUrlEvent({
          s3Key: mediaFile.s3Key,
          fullAccess: true,
        }),
      );

      if (response.previewUrl) {
        item.media.videoUrl = response.previewUrl;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to refresh full tutorial video URL for ${item.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
