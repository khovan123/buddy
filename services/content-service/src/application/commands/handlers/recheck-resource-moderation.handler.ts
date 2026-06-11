import { AppLogger } from '@libs/common';
import {
  ContentModerationCompletedEvent,
  GetUploadHistoryByContentEvent,
  UploadHistoryItemRpcResponseDto,
} from '@libs/contracts';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../../../domain/repositories/tokens';
import { ContentModerationNotificationPublisher } from '../../../infrastructure/messaging/publishers/content-moderation-notification.publisher';
import { RecommendationSyncPublisher } from '../../../infrastructure/messaging/publishers/recommendation-sync.publisher';
import { StorageBrokerPublisher } from '../../../infrastructure/messaging/publishers/storage-broker.rpc';
import { ContentModerationStatus } from '../../../infrastructure/persistence/mongo/schemas/resource.schema';
import { ContentModerationService } from '../../../infrastructure/services/content-moderation.service';
import { RecheckResourceModerationCommand } from '../recheck-resource-moderation.command';

@CommandHandler(RecheckResourceModerationCommand)
@Injectable()
export class RecheckResourceModerationHandler implements ICommandHandler<RecheckResourceModerationCommand> {
  private readonly logger = new AppLogger(RecheckResourceModerationHandler.name);

  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,
    private readonly storageBrokerPublisher: StorageBrokerPublisher,
    private readonly contentModeration: ContentModerationService,
    private readonly recommendationSync: RecommendationSyncPublisher,
    private readonly moderationNotification: ContentModerationNotificationPublisher,
  ) {}

  async execute(command: RecheckResourceModerationCommand) {
    const resource = await this.resourceRepository.findByIdWithDetails(command.resourceId);
    if (!resource) {
      throw new NotFoundException('Resource not found');
    }
    if (resource.userId !== command.requesterId) {
      throw new ForbiddenException('You can only recheck your own resources');
    }

    const histories = await this.fetchUploadHistory(resource.id);
    const result = await this.contentModeration.moderate({
      contentId: resource.id,
      contentType: 'RESOURCE',
      title: resource.title,
      body: resource.summary,
      hightlights: resource.hightlights,
      major: resource.major?.name,
      course: resource.course?.name,
      extractedText: '',
      mediaUrls: this.resolveMediaUrls(histories),
      files: this.resolveModerationFiles(histories),
      extractionStatus: this.resolveExtractionStatus(histories),
      extractionError: this.resolveExtractionError(histories),
    });

    await this.resourceRepository.applyModerationResult(resource.id, {
      status: this.toModerationStatus(result.decision),
      score: result.score,
      reasons: result.reasons,
      ruleVersion: result.ruleVersion,
    });

    await this.moderationNotification.send(
      new ContentModerationCompletedEvent(
        {
          contentId: resource.id,
          contentType: 'RESOURCE',
          ownerId: resource.userId,
          title: resource.title,
          slug: resource.slug,
          decision: result.decision,
          score: result.score,
          reasons: result.reasons,
          ruleVersion: result.ruleVersion,
          moderatedAt: new Date().toISOString(),
        },
        command.correlationId,
      ),
    );

    if (result.decision === 'APPROVED') {
      await this.recommendationSync.send({
        type: 'ITEM_UPSERT',
        itemId: resource.id,
        itemType: 'RESOURCE',
        majorId: resource.majorId,
        courseId: resource.courseId,
        title: resource.title,
        slug: resource.slug,
        summary: resource.summary,
        hightlights: resource.hightlights,
      });
    }

    return {
      contentId: resource.id,
      contentType: 'RESOURCE',
      decision: result.decision,
      score: result.score,
      reasons: result.reasons,
      ruleVersion: result.ruleVersion,
    };
  }

  private async fetchUploadHistory(contentId: string): Promise<UploadHistoryItemRpcResponseDto[]> {
    try {
      return await this.storageBrokerPublisher.getUploadHistoryByContent(
        new GetUploadHistoryByContentEvent({ contentId }),
      );
    } catch (error) {
      this.logger.warn(
        `Manual resource moderation could not fetch upload history: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  private resolveMediaUrls(histories: UploadHistoryItemRpcResponseDto[]): string[] {
    return histories
      .flatMap((item) => [item.downloadUrl, item.streamingUrl, item.trailerUrl])
      .filter((url): url is string => Boolean(url));
  }

  private resolveModerationFiles(
    histories: UploadHistoryItemRpcResponseDto[],
  ): Array<{ originalFilename?: string | null; mimeType?: string | null }> {
    return histories.map((item) => ({
      originalFilename: item.originalFilename,
      mimeType: item.mimeType,
    }));
  }

  private resolveExtractionStatus(histories: UploadHistoryItemRpcResponseDto[]): string {
    if (histories.length === 0) {
      return 'MISSING_UPLOAD_HISTORY';
    }
    if (histories.every((item) => item.status === 'AVAILABLE')) {
      return 'AVAILABLE';
    }
    if (histories.some((item) => item.status === 'FAILED')) {
      return 'FAILED';
    }
    return 'PROCESSING';
  }

  private resolveExtractionError(histories: UploadHistoryItemRpcResponseDto[]): string | null {
    const errors = histories
      .map((item) => item.processingError)
      .filter((error): error is string => Boolean(error));
    return errors.length > 0 ? errors.join('; ') : null;
  }

  private toModerationStatus(decision: string): ContentModerationStatus {
    if (decision === 'APPROVED') return ContentModerationStatus.APPROVED;
    if (decision === 'REJECTED') return ContentModerationStatus.REJECTED;
    if (decision === 'ERROR') return ContentModerationStatus.ERROR;
    return ContentModerationStatus.NEEDS_REVIEW;
  }
}
