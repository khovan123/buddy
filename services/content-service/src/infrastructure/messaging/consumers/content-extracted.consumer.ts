import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { AppLogger, EXCHANGES, QUEUES } from '@libs/common';
import {
  ContentExtractedEvent,
  UPLOAD_ROUTINGKEYS,
  extractRmqPayload,
  type RmqMessagePayload,
} from '@libs/contracts';
import { Controller, Inject } from '@nestjs/common';
import type { ConsumeMessage } from 'amqplib';

import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY, TUTORIAL_REPOSITORY } from '../../../domain/repositories/tokens';
import type { ITutorialRepository } from '../../../domain/repositories/tutorial.repository.interface';
import { ContentModerationStatus as ResourceModerationStatus } from '../../persistence/mongo/schemas/resource.schema';
import { ContentModerationStatus as TutorialModerationStatus } from '../../persistence/mongo/schemas/tutorial.schema';
import { ContentModerationService } from '../../services/content-moderation.service';
import { RecommendationSyncPublisher } from '../publishers/recommendation-sync.publisher';

@Controller()
export class ContentExtractedConsumer {
  private readonly logger = new AppLogger(ContentExtractedConsumer.name);

  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,
    @Inject(TUTORIAL_REPOSITORY)
    private readonly tutorialRepository: ITutorialRepository,
    private readonly contentModeration: ContentModerationService,
    private readonly recommendationSync: RecommendationSyncPublisher,
  ) {}

  @RabbitSubscribe({
    exchange: EXCHANGES.UPLOAD,
    routingKey: UPLOAD_ROUTINGKEYS.CONTENT_EXTRACTED,
    queue: QUEUES.CONTENT_RESOURCE_EVENTS,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleContentExtracted(
    messageData: RmqMessagePayload<ContentExtractedEvent['payload']>,
    _message: ConsumeMessage,
  ): Promise<void | Nack> {
    const payload = extractRmqPayload(messageData);

    try {
      if (payload.contentType === 'RESOURCE') {
        await this.moderateResource(payload);
      } else {
        await this.moderateTutorial(payload);
      }
    } catch (error) {
      this.logger.error(
        `Failed to moderate extracted ${payload.contentType} content ${payload.contentId}`,
        String(error),
      );
      return new Nack(false);
    }
  }

  private async moderateResource(payload: ContentExtractedEvent['payload']): Promise<void> {
    const resource = await this.resourceRepository.findByIdWithDetails(payload.contentId);
    if (!resource) {
      this.logger.warn(`Resource ${payload.contentId} not found for extracted moderation`);
      return;
    }

    const result = await this.contentModeration.moderate({
      contentId: resource.id,
      contentType: 'RESOURCE',
      title: resource.title,
      body: resource.summary,
      hightlights: resource.hightlights,
      major: resource.major?.name,
      course: resource.course?.name,
      extractedText: this.joinExtractedText(payload),
      mediaUrls: payload.files.map((item) => item.downloadUrl).filter((url): url is string =>
        Boolean(url),
      ),
      extractionStatus: this.resolveExtractionStatus(payload),
      extractionError: this.joinExtractionErrors(payload),
    });

    await this.resourceRepository.applyModerationResult(resource.id, {
      status: this.toResourceStatus(result.decision),
      score: result.score,
      reasons: result.reasons,
      ruleVersion: result.ruleVersion,
    });

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
  }

  private async moderateTutorial(payload: ContentExtractedEvent['payload']): Promise<void> {
    const fileId = payload.files[0]?.fileId;
    if (!fileId) {
      this.logger.warn(`No tutorial file found in extraction event ${payload.contentId}`);
      return;
    }

    const tutorial = await this.tutorialRepository.findByMediaFileIdWithDetails(fileId);
    if (!tutorial) {
      this.logger.warn(`Tutorial for fileId ${fileId} not found for extracted moderation`);
      return;
    }

    const result = await this.contentModeration.moderate({
      contentId: tutorial.id,
      contentType: 'TUTORIAL',
      title: tutorial.title,
      body: tutorial.description,
      hightlights: tutorial.hightlights,
      major: tutorial.major?.name,
      course: tutorial.course?.name,
      extractedText: this.joinExtractedText(payload),
      mediaUrls: [],
      extractionStatus: this.resolveExtractionStatus(payload),
      extractionError: this.joinExtractionErrors(payload),
    });

    await this.tutorialRepository.applyModerationResult(tutorial.id, {
      status: this.toTutorialStatus(result.decision),
      score: result.score,
      reasons: result.reasons,
      ruleVersion: result.ruleVersion,
    });

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
        steps: tutorial.steps?.map((s) => ({ title: s.title })),
      });
    }
  }

  private joinExtractedText(payload: ContentExtractedEvent['payload']): string {
    return payload.files
      .map((item) => item.extractedText)
      .filter((text): text is string => Boolean(text && text.trim().length > 0))
      .join('\n\n');
  }

  private joinExtractionErrors(payload: ContentExtractedEvent['payload']): string | null {
    const errors = payload.files
      .map((item) => item.extractionError)
      .filter((reason): reason is string => Boolean(reason));
    return errors.length > 0 ? errors.join('; ') : null;
  }

  private resolveExtractionStatus(payload: ContentExtractedEvent['payload']): string {
    return payload.files.every((item) => item.extractionStatus === 'AVAILABLE')
      ? 'AVAILABLE'
      : 'PARTIAL';
  }

  private toResourceStatus(decision: string): ResourceModerationStatus {
    if (decision === 'APPROVED') return ResourceModerationStatus.APPROVED;
    if (decision === 'REJECTED') return ResourceModerationStatus.REJECTED;
    if (decision === 'ERROR') return ResourceModerationStatus.ERROR;
    return ResourceModerationStatus.NEEDS_REVIEW;
  }

  private toTutorialStatus(decision: string): TutorialModerationStatus {
    if (decision === 'APPROVED') return TutorialModerationStatus.APPROVED;
    if (decision === 'REJECTED') return TutorialModerationStatus.REJECTED;
    if (decision === 'ERROR') return TutorialModerationStatus.ERROR;
    return TutorialModerationStatus.NEEDS_REVIEW;
  }
}
