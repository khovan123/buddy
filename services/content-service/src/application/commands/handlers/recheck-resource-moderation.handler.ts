import { AppLogger } from '@libs/common';
import {
  ContentExtractionRpcResponseDto,
  ContentModerationCompletedEvent,
  ReextractContentEvent,
} from '@libs/contracts';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import { RESOURCE_REPOSITORY } from '../../../domain/repositories/tokens';
import { ContentModerationNotificationPublisher } from '../../../infrastructure/messaging/publishers/content-moderation-notification.publisher';
import { RecommendationSyncPublisher } from '../../../infrastructure/messaging/publishers/recommendation-sync.publisher';
import { StorageBrokerPublisher } from '../../../infrastructure/messaging/publishers/storage-broker.rpc';
import { ContentModerationStatus } from '../../../infrastructure/persistence/mongo/schemas/resource.schema';
import {
  ContentModerationService,
  type ModerationResult,
} from '../../../infrastructure/services/content-moderation.service';
import { ContentSettingsService } from '../../../infrastructure/services/content-settings.service';
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
    private readonly contentSettings: ContentSettingsService,
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

    const moderationEnabled = await this.contentSettings.isModerationEnabled();
    const extraction = moderationEnabled
      ? await this.fetchContentExtraction(resource.id, command.correlationId)
      : null;
    const result: ModerationResult =
      !moderationEnabled
        ? this.createModerationDisabledResult()
        : extraction && extraction.files.length > 0
          ? await this.contentModeration.moderate({
            contentId: resource.id,
            contentType: 'RESOURCE',
            title: resource.title,
            body: resource.summary,
            hightlights: resource.hightlights,
            major: resource.major?.name,
            course: resource.course?.name,
            extractedText: this.joinExtractedText(extraction),
            mediaUrls: this.resolveMediaUrls(extraction),
            files: this.resolveModerationFiles(extraction),
            extractionStatus: this.resolveExtractionStatus(extraction),
            extractionError: this.resolveExtractionError(extraction),
          })
          : this.createExtractionUnavailableResult();

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

  private async fetchContentExtraction(
    contentId: string,
    correlationId?: string,
  ): Promise<ContentExtractionRpcResponseDto | null> {
    try {
      return await this.storageBrokerPublisher.reextractContent(
        new ReextractContentEvent({ contentId, contentType: 'RESOURCE' }, correlationId),
      );
    } catch (error) {
      this.logger.warn(
        `Manual resource moderation could not re-extract content: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private createExtractionUnavailableResult(): ModerationResult {
    return {
      decision: 'NEEDS_REVIEW',
      score: null,
      reasons: [
        'Could not re-extract uploaded file content from storage. Please retry moderation or review manually.',
      ],
      ruleVersion: 'manual-recheck-extraction-unavailable',
    };
  }

  private createModerationDisabledResult(): ModerationResult {
    return {
      decision: 'APPROVED',
      score: null,
      reasons: ['Content moderation disabled by admin setting.'],
      ruleVersion: 'runtime-moderation-disabled',
    };
  }

  private joinExtractedText(extraction: ContentExtractionRpcResponseDto): string {
    return extraction.files
      .map((item) => item.extractedText)
      .filter((text): text is string => Boolean(text && text.trim().length > 0))
      .join('\n\n');
  }

  private resolveMediaUrls(extraction: ContentExtractionRpcResponseDto): string[] {
    return extraction.files
      .map((item) => item.downloadUrl)
      .filter((url): url is string => Boolean(url));
  }

  private resolveModerationFiles(
    extraction: ContentExtractionRpcResponseDto,
  ): Array<{ originalFilename?: string | null; mimeType?: string | null }> {
    return extraction.files.map((item) => ({
      originalFilename: item.originalFilename,
      mimeType: item.mimeType,
    }));
  }

  private resolveExtractionStatus(extraction: ContentExtractionRpcResponseDto): string {
    const [firstFile] = extraction.files;
    const firstStatus = firstFile?.extractionStatus;
    if (firstStatus && extraction.files.every((item) => item.extractionStatus === firstStatus)) {
      return firstStatus;
    }
    return 'PARTIAL';
  }

  private resolveExtractionError(extraction: ContentExtractionRpcResponseDto): string | null {
    const errors = extraction.files
      .map((item) => item.extractionError)
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
