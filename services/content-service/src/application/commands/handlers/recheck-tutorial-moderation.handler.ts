import { ContentModerationCompletedEvent } from '@libs/contracts';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import type { ITutorialRepository } from '../../../domain/repositories/tutorial.repository.interface';
import { TUTORIAL_REPOSITORY } from '../../../domain/repositories/tokens';
import {
  ContentModerationStatus,
  TutorialStatus,
} from '../../../infrastructure/persistence/mongo/schemas/tutorial.schema';
import { ContentModerationNotificationPublisher } from '../../../infrastructure/messaging/publishers/content-moderation-notification.publisher';
import { RecommendationSyncPublisher } from '../../../infrastructure/messaging/publishers/recommendation-sync.publisher';
import { RecheckTutorialModerationCommand } from '../recheck-tutorial-moderation.command';

@CommandHandler(RecheckTutorialModerationCommand)
@Injectable()
export class RecheckTutorialModerationHandler implements ICommandHandler<RecheckTutorialModerationCommand> {
  constructor(
    @Inject(TUTORIAL_REPOSITORY)
    private readonly tutorialRepository: ITutorialRepository,
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
    if (tutorial.status === TutorialStatus.AVAILABLE) {
      throw new ForbiddenException('Available tutorials cannot be rechecked');
    }

    await this.tutorialRepository.applyModerationResult(tutorial.id, {
      status: ContentModerationStatus.APPROVED,
      score: null,
      reasons: ['Tutorial moderation skipped by policy.'],
      ruleVersion: 'tutorial-moderation-skipped',
    });

    await this.moderationNotification.send(
      new ContentModerationCompletedEvent(
        {
          contentId: tutorial.id,
          contentType: 'TUTORIAL',
          ownerId: tutorial.userId,
          title: tutorial.title,
          slug: tutorial.slug,
          decision: 'APPROVED',
          score: null,
          reasons: ['Tutorial moderation skipped by policy.'],
          ruleVersion: 'tutorial-moderation-skipped',
          moderatedAt: new Date().toISOString(),
        },
        command.correlationId,
      ),
    );

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

    return {
      contentId: tutorial.id,
      contentType: 'TUTORIAL',
      decision: 'APPROVED',
      score: null,
      reasons: ['Tutorial moderation skipped by policy.'],
      ruleVersion: 'tutorial-moderation-skipped',
    };
  }
}
