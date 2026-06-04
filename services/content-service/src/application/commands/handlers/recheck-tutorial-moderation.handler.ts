import { AppLogger } from '@libs/common';
import {
  ContentModerationCompletedEvent,
  GetUploadHistoryByContentEvent,
  UploadHistoryItemRpcResponseDto,
} from '@libs/contracts';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import type { ITutorialRepository } from '../../../domain/repositories/tutorial.repository.interface';
import { TUTORIAL_REPOSITORY } from '../../../domain/repositories/tokens';
import { ContentModerationStatus } from '../../../infrastructure/persistence/mongo/schemas/tutorial.schema';
import { ContentModerationNotificationPublisher } from '../../../infrastructure/messaging/publishers/content-moderation-notification.publisher';
import { RecommendationSyncPublisher } from '../../../infrastructure/messaging/publishers/recommendation-sync.publisher';
import { StorageBrokerPublisher } from '../../../infrastructure/messaging/publishers/storage-broker.rpc';
import { ContentModerationService } from '../../../infrastructure/services/content-moderation.service';
import { RecheckTutorialModerationCommand } from '../recheck-tutorial-moderation.command';

@CommandHandler(RecheckTutorialModerationCommand)
@Injectable()
export class RecheckTutorialModerationHandler implements ICommandHandler<RecheckTutorialModerationCommand> {
  private readonly logger = new AppLogger(RecheckTutorialModerationHandler.name);

  constructor(
    @Inject(TUTORIAL_REPOSITORY)
    private readonly tutorialRepository: ITutorialRepository,
    private readonly storageBrokerPublisher: StorageBrokerPublisher,
    private readonly contentModeration: ContentModerationService,
    private readonly recommendationSync: RecommendationSyncPublisher,
    private readonly moderationNotification: ContentModerationNotificationPublisher,
  ) {}

  async execute(command: RecheckTutorialModerationCommand) {
    const tutorial = await this.tutorialRepository.findByIdWithDetails(command.tutorialId);
    if (!tutorial) {
      throw new NotFoundException('Tutorial not found');
    }
    if (tutorial.userId !== command.requesterId) {
      throw new ForbiddenException('You can only recheck your own tutorials');
    }

    const histories = await this.fetchUploadHistory(tutorial.id);
    const result = await this.contentModeration.moderate({
      contentId: tutorial.id,
      contentType: 'TUTORIAL',
      title: tutorial.title,
      body: tutorial.description,
      hightlights: tutorial.hightlights,
      major: tutorial.major?.name,
      course: tutorial.course?.name,
      extractedText: '',
      mediaUrls: this.resolveMediaUrls(histories),
      extractionStatus: this.resolveExtractionStatus(histories),
      extractionError: this.resolveExtractionError(histories),
    });

    await this.tutorialRepository.applyModerationResult(tutorial.id, {
      status: this.toModerationStatus(result.decision),
      score: result.score,
      reasons: result.reasons,
      ruleVersion: result.ruleVersion,
    });

    await this.moderationNotification.send(
      new ContentModerationCompletedEvent(
        {
          contentId: tutorial.id,
          contentType: 'TUTORIAL',
          ownerId: tutorial.userId,
          title: tutorial.title,
          slug: tutorial.slug,
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
        itemId: tutorial.id,
        itemType: 'TUTORIAL',
        majorId: tutorial.majorId,
        courseId: tutorial.courseId,
        title: tutorial.title,
        slug: tutorial.slug,
        description: tutorial.description,
        hightlights: tutorial.hightlights,
        steps: tutorial.steps?.map((step) => ({ title: step.title })),
      });
    }

    return {
      contentId: tutorial.id,
      contentType: 'TUTORIAL',
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
        `Manual tutorial moderation could not fetch upload history: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  private resolveMediaUrls(histories: UploadHistoryItemRpcResponseDto[]): string[] {
    return histories
      .flatMap((item) => [item.streamingUrl, item.trailerUrl, item.downloadUrl])
      .filter((url): url is string => Boolean(url));
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
