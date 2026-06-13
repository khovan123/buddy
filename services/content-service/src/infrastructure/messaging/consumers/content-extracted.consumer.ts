import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { AppLogger, EXCHANGES, QUEUES, RETRY_OPTIONS } from '@libs/common';
import {
  ContentModerationCompletedEvent,
  ContentExtractedEvent,
  UPLOAD_ROUTINGKEYS,
  extractRmqPayload,
  type RmqMessagePayload,
} from '@libs/contracts';
import { Injectable, Inject } from '@nestjs/common';
import type { ConsumeMessage } from 'amqplib';

import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY, TUTORIAL_REPOSITORY } from '../../../domain/repositories/tokens';
import type { ITutorialRepository } from '../../../domain/repositories/tutorial.repository.interface';
import { ContentModerationStatus as ResourceModerationStatus } from '../../persistence/mongo/schemas/resource.schema';
import { ContentModerationStatus as TutorialModerationStatus } from '../../persistence/mongo/schemas/tutorial.schema';
import { ContentModerationService } from '../../services/content-moderation.service';
import { IdempotentConsumerService } from '../../services/idempotent-consumer.service';
import { ContentRetryPublisher } from '../publishers/content-retry.publisher';
import { ContentModerationNotificationPublisher } from '../publishers/content-moderation-notification.publisher';
import { RecommendationSyncPublisher } from '../publishers/recommendation-sync.publisher';

@Injectable()
export class ContentExtractedConsumer {
  private readonly logger = new AppLogger(ContentExtractedConsumer.name);

  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,
    @Inject(TUTORIAL_REPOSITORY)
    private readonly tutorialRepository: ITutorialRepository,
    private readonly contentModeration: ContentModerationService,
    private readonly recommendationSync: RecommendationSyncPublisher,
    private readonly moderationNotification: ContentModerationNotificationPublisher,
    private readonly idempotentConsumer: IdempotentConsumerService,
    private readonly contentRetry: ContentRetryPublisher,
  ) {}

  @RabbitSubscribe({
    exchange: EXCHANGES.UPLOAD,
    routingKey: UPLOAD_ROUTINGKEYS.CONTENT_EXTRACTED,
    queue: QUEUES.CONTENT_EXTRACTED_EVENTS,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleContentExtracted(
    messageData: RmqMessagePayload<ContentExtractedEvent['payload']>,
    message: ConsumeMessage,
  ): Promise<void | Nack> {
    const rawPayload = extractRmqPayload<ContentExtractedEvent['payload']>(messageData, [
      'contentId',
      'contentType',
      'files',
    ]);
    const payload: ContentExtractedEvent['payload'] = {
      ...rawPayload,
      files: this.normalizeFiles(rawPayload.files),
    };
    const contentType = this.normalizeContentType(payload.contentType);
    const correlationId = this.idempotentConsumer.resolveCorrelationId(
      message as unknown as Record<string, unknown>,
      payload.contentId,
    );

    if (!Array.isArray(rawPayload.files)) {
      this.logger.warn(
        `Received ${UPLOAD_ROUTINGKEYS.CONTENT_EXTRACTED} for ${contentType} ${payload.contentId} with missing or invalid files payload; continuing with 0 file(s)`,
      );
    }

    this.logger.log(
      `Received ${UPLOAD_ROUTINGKEYS.CONTENT_EXTRACTED} for ${contentType} ${payload.contentId} with ${payload.files.length} file(s)`,
    );

    try {
      const processed = await this.idempotentConsumer.runWithIdempotency(
        correlationId,
        UPLOAD_ROUTINGKEYS.CONTENT_EXTRACTED,
        async () => {
          if (contentType === 'RESOURCE') {
            await this.moderateResource(payload, correlationId);
          } else {
            await this.moderateTutorial(payload, correlationId);
          }
        },
      );

      if (processed === false) {
        this.logger.warn(
          `Skipped ${UPLOAD_ROUTINGKEYS.CONTENT_EXTRACTED} for ${contentType} ${payload.contentId}: already processed for correlationId=${correlationId}`,
        );
        return;
      }

      this.logger.log(
        `Successfully processed ${UPLOAD_ROUTINGKEYS.CONTENT_EXTRACTED} for ${contentType} ${payload.contentId}`,
      );
    } catch (error) {
      const headers = message.properties?.headers;
      const rawRetryCount = headers?.['x-retry-count'];
      const parsedRetryCount = Number(rawRetryCount ?? 0);
      const retryCount = Number.isNaN(parsedRetryCount) ? 0 : parsedRetryCount;
      const willRetry = retryCount < RETRY_OPTIONS.MAX_RETRIES;

      this.logger[willRetry ? 'warn' : 'error'](
        `Failed to moderate extracted ${contentType} content ${payload.contentId}` +
          ` (attempt ${retryCount + 1}/${RETRY_OPTIONS.MAX_RETRIES + 1})` +
          (willRetry ? ' — republishing for retry' : ' — sending to DLQ'),
        String(error),
      );

      if (willRetry) {
        try {
          await this.contentRetry.republishForRetry(
            UPLOAD_ROUTINGKEYS.CONTENT_EXTRACTED,
            messageData,
            retryCount + 1,
            correlationId,
          );
          return; // ack original; retry is the republished copy
        } catch (publishErr) {
          this.logger.error(
            `Republish failed for ${contentType} ${payload.contentId}` +
              ` — sending original to DLQ to prevent message loss`,
            String(publishErr),
          );
          return new Nack(false);
        }
      }

      return new Nack(false); // → dead-letter exchange
    }
  }

  private async moderateResource(
    payload: ContentExtractedEvent['payload'],
    correlationId: string,
  ): Promise<void> {
    const resource = await this.resourceRepository.findByIdWithDetails(payload.contentId);
    if (!resource) {
      this.logger.warn(`Resource ${payload.contentId} not found for extracted moderation`);
      return;
    }

    this.logger.log(
      `[handleContentExtracted] Starting moderation for RESOURCE ${resource.id} (${resource.title}); files=${payload.files.length}, extractionStatus=${this.resolveExtractionStatus(payload)}`,
    );

    const result = await this.contentModeration.moderate({
      contentId: resource.id,
      contentType: 'RESOURCE',
      title: resource.title,
      body: resource.summary,
      hightlights: resource.hightlights,
      major: resource.major?.name,
      course: resource.course?.name,
      extractedText: this.joinExtractedText(payload),
      mediaUrls: payload.files
        .map((item) => item.downloadUrl)
        .filter((url): url is string => Boolean(url)),
      files: this.resolveModerationFiles(payload),
      extractionStatus: this.resolveExtractionStatus(payload),
      extractionError: this.joinExtractionErrors(payload),
    });

    this.logger.log(
      `[handleContentExtracted] Moderation result for RESOURCE ${resource.id}: decision=${result.decision}, score=${result.score}, ruleVersion=${result.ruleVersion}, reasons=${result.reasons.length}`,
    );

    await this.resourceRepository.applyModerationResult(resource.id, {
      status: this.toResourceStatus(result.decision),
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
          decision: this.toModerationDecision(result.decision),
          score: result.score,
          reasons: result.reasons,
          ruleVersion: result.ruleVersion,
          moderatedAt: new Date().toISOString(),
        },
        correlationId,
      ),
    );

    if (result.decision === 'APPROVED') {
      this.logger.log(
        `[handleContentExtracted] RESOURCE ${resource.id} approved; publishing recommendation sync`,
      );
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

  private async moderateTutorial(
    payload: ContentExtractedEvent['payload'],
    correlationId: string,
  ): Promise<void> {
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

    this.logger.log(
      `[handleContentExtracted] Starting moderation for TUTORIAL ${tutorial.id} (${tutorial.title}); files=${payload.files.length}, extractionStatus=${this.resolveExtractionStatus(payload)}`,
    );

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
      files: this.resolveModerationFiles(payload),
      extractionStatus: this.resolveExtractionStatus(payload),
      extractionError: this.joinExtractionErrors(payload),
    });

    this.logger.log(
      `[handleContentExtracted] Moderation result for TUTORIAL ${tutorial.id}: decision=${result.decision}, score=${result.score}, ruleVersion=${result.ruleVersion}, reasons=${result.reasons.length}`,
    );

    await this.tutorialRepository.applyModerationResult(tutorial.id, {
      status: this.toTutorialStatus(result.decision),
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
          decision: this.toModerationDecision(result.decision),
          score: result.score,
          reasons: result.reasons,
          ruleVersion: result.ruleVersion,
          moderatedAt: new Date().toISOString(),
        },
        correlationId,
      ),
    );

    if (result.decision === 'APPROVED') {
      this.logger.log(
        `[handleContentExtracted] TUTORIAL ${tutorial.id} approved; publishing recommendation sync`,
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

  private resolveModerationFiles(
    payload: ContentExtractedEvent['payload'],
  ): Array<{ originalFilename?: string | null; mimeType?: string | null }> {
    return payload.files.map((file) => ({
      originalFilename: file.originalFilename,
      mimeType: file.mimeType,
    }));
  }

  private resolveExtractionStatus(payload: ContentExtractedEvent['payload']): string {
    const [firstFile] = payload.files;
    const firstStatus = firstFile?.extractionStatus;
    if (firstStatus && payload.files.every((item) => item.extractionStatus === firstStatus)) {
      return firstStatus;
    }
    return 'PARTIAL';
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

  private toModerationDecision(
    decision: string,
  ): ContentModerationCompletedEvent['payload']['decision'] {
    if (decision === 'APPROVED') return 'APPROVED';
    if (decision === 'REJECTED') return 'REJECTED';
    if (decision === 'ERROR') return 'ERROR';
    return 'NEEDS_REVIEW';
  }

  private normalizeContentType(
    contentType: unknown,
  ): ContentExtractedEvent['payload']['contentType'] {
    return String(contentType).trim().toUpperCase() === 'TUTORIAL' ? 'TUTORIAL' : 'RESOURCE';
  }

  private normalizeFiles(files: unknown): ContentExtractedEvent['payload']['files'] {
    return Array.isArray(files) ? files : [];
  }
}
