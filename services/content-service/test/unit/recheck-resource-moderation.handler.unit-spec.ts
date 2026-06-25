/// <reference types="jest" />

import { ContentModerationStatus } from '../../src/infrastructure/persistence/mongo/schemas/resource.schema';
import { RecheckResourceModerationHandler } from '../../src/application/commands/handlers/recheck-resource-moderation.handler';
import { RecheckResourceModerationCommand } from '../../src/application/commands/recheck-resource-moderation.command';

describe('RecheckResourceModerationHandler', () => {
  const resource = {
    id: 'resource-1',
    userId: 'user-1',
    title: 'MLN111 note',
    slug: 'mln111-note',
    summary: 'Course note',
    hightlights: ['chapter 1'],
    majorId: 'major-1',
    courseId: 'course-1',
    major: { name: 'Software Engineering' },
    course: { name: 'MLN111' },
  };

  const createHandler = () => {
    const resourceRepository = {
      findByIdWithDetails: jest.fn().mockResolvedValue(resource),
      applyModerationResult: jest.fn().mockResolvedValue(undefined),
    };
    const storageBrokerPublisher = {
      reextractContent: jest.fn(),
    };
    const contentModeration = {
      moderate: jest.fn().mockResolvedValue({
        decision: 'APPROVED',
        score: 0.01,
        reasons: ['Looks good.'],
        ruleVersion: 'test-rule',
      }),
    };
    const recommendationSync = {
      send: jest.fn().mockResolvedValue(undefined),
    };
    const moderationNotification = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    return {
      handler: new RecheckResourceModerationHandler(
        resourceRepository as never,
        storageBrokerPublisher as never,
        contentModeration as never,
        recommendationSync as never,
        moderationNotification as never,
      ),
      resourceRepository,
      storageBrokerPublisher,
      contentModeration,
      recommendationSync,
      moderationNotification,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('re-extracts from upload-service and moderates with extracted text', async () => {
    const { handler, storageBrokerPublisher, contentModeration, resourceRepository } =
      createHandler();
    storageBrokerPublisher.reextractContent.mockResolvedValue({
      contentId: resource.id,
      contentType: 'RESOURCE',
      files: [
        {
          fileId: 'file-1',
          s3Key: 'docs/resource-1/note.docx',
          downloadUrl: 'https://storage.example/note.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          originalFilename: 'note.docx',
          extractedText: 'Real document text from S3.',
          extractionStatus: 'AVAILABLE',
          extractionError: null,
        },
      ],
      extractedAt: new Date().toISOString(),
    });

    await handler.execute(
      new RecheckResourceModerationCommand(resource.id, resource.userId, 'c-1'),
    );

    expect(storageBrokerPublisher.reextractContent).toHaveBeenCalledTimes(1);
    expect(contentModeration.moderate).toHaveBeenCalledWith(
      expect.objectContaining({
        contentId: resource.id,
        extractedText: 'Real document text from S3.',
        extractionStatus: 'AVAILABLE',
        extractionError: null,
      }),
    );
    expect(resourceRepository.applyModerationResult).toHaveBeenCalledWith(resource.id, {
      status: ContentModerationStatus.APPROVED,
      score: 0.01,
      reasons: ['Looks good.'],
      ruleVersion: 'test-rule',
    });
  });

  it('does not call moderation with empty text when re-extraction RPC fails', async () => {
    const { handler, storageBrokerPublisher, contentModeration, resourceRepository } =
      createHandler();
    storageBrokerPublisher.reextractContent.mockRejectedValue(new Error('RPC timeout'));

    const result = await handler.execute(
      new RecheckResourceModerationCommand(resource.id, resource.userId, 'c-1'),
    );

    expect(contentModeration.moderate).not.toHaveBeenCalled();
    expect(result.decision).toBe('NEEDS_REVIEW');
    expect(result.reasons.join(' ')).not.toMatch(/corrupted|unreadable/i);
    expect(resourceRepository.applyModerationResult).toHaveBeenCalledWith(resource.id, {
      status: ContentModerationStatus.NEEDS_REVIEW,
      score: null,
      reasons: [
        'Could not re-extract uploaded file content from storage. Please retry moderation or review manually.',
      ],
      ruleVersion: 'manual-recheck-extraction-unavailable',
    });
  });
});
