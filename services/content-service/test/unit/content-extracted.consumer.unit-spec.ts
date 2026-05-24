/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="jest" />

import { Nack } from '@golevelup/nestjs-rabbitmq';
import { UPLOAD_ROUTINGKEYS, type ContentExtractedEvent } from '@libs/contracts';

import type { ResourceQueryItem } from '../../src/domain/repositories/resource.repository.interface';
import type { TutorialQueryItem } from '../../src/domain/repositories/tutorial.repository.interface';
import { ContentExtractedConsumer } from '../../src/infrastructure/messaging/consumers/content-extracted.consumer';
import { ContentModerationStatus as ResourceModerationStatus } from '../../src/infrastructure/persistence/mongo/schemas/resource.schema';
import { ContentModerationStatus as TutorialModerationStatus } from '../../src/infrastructure/persistence/mongo/schemas/tutorial.schema';
import type { ModerationResult } from '../../src/infrastructure/services/content-moderation.service';

// ──────────────────────────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────────────────────────

function makeResourcePayload(
  overrides?: Partial<ContentExtractedEvent['payload']>,
): ContentExtractedEvent['payload'] {
  return {
    contentId: 'res-001',
    contentType: 'RESOURCE',
    files: [
      {
        fileId: 'file-r1',
        s3Key: 'docs/res-001/file-r1-notes.pdf',
        downloadUrl: 'https://cdn.example/file-r1',
        mimeType: 'application/pdf',
        originalFilename: 'notes.pdf',
        extractedText: 'Educational content about algorithms',
        extractionStatus: 'AVAILABLE',
        extractionError: null,
      },
    ],
    extractedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeTutorialPayload(
  overrides?: Partial<ContentExtractedEvent['payload']>,
): ContentExtractedEvent['payload'] {
  return {
    contentId: 'tut-upload-001',
    contentType: 'TUTORIAL',
    files: [
      {
        fileId: 'file-t1',
        s3Key: 'videos/tut-001/file-t1-lecture.mp4',
        downloadUrl: null,
        mimeType: 'video/mp4',
        originalFilename: 'lecture.mp4',
        extractedText: 'Transcript of a calculus lecture',
        extractionStatus: 'AVAILABLE',
        extractionError: null,
      },
    ],
    extractedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeResourceQueryItem(overrides?: Partial<ResourceQueryItem>): ResourceQueryItem {
  return {
    id: 'res-001',
    userId: 'user-001',
    title: 'Algorithms 101',
    slug: 'algorithms-101',
    summary: 'Intro to algorithms',
    hightlights: ['sorting', 'searching'],
    majorId: 'major-cs',
    courseId: 'course-algo',
    price: 50000,
    status: 'PROCESSING' as any,
    moderationStatus: ResourceModerationStatus.PENDING,
    moderationScore: null,
    moderationReasons: [],
    moderationRuleVersion: null,
    moderatedAt: null,
    resourceVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { resourceMeta: 1, resourceOrders: 0 },
    major: {
      id: 'major-cs',
      code: 'CS',
      name: 'Computer Science',
      description: '',
      status: 'ACTIVE' as any,
    },
    course: {
      id: 'course-algo',
      code: 'ALGO',
      name: 'Algorithms',
      credits: 3,
      semester: 2,
      isCompulsory: true,
      status: 'ACTIVE' as any,
    },
    ...overrides,
  } as ResourceQueryItem;
}

function makeTutorialQueryItem(overrides?: Partial<TutorialQueryItem>): TutorialQueryItem {
  return {
    id: 'tut-001',
    userId: 'user-001',
    title: 'Calculus Tutorial',
    slug: 'calculus-tutorial',
    description: 'Learn calculus step by step',
    hightlights: ['derivatives', 'integrals'],
    majorId: 'major-math',
    courseId: 'course-calc',
    price: 30000,
    status: 'PROCESSING' as any,
    moderationStatus: TutorialModerationStatus.PENDING,
    moderationScore: null,
    moderationReasons: [],
    moderationRuleVersion: null,
    moderatedAt: null,
    isVerified: false,
    discountBundle: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { tutorialMedia: 1, tutorialOrders: 0 },
    major: {
      id: 'major-math',
      code: 'MATH',
      name: 'Mathematics',
      description: '',
      status: 'ACTIVE' as any,
    },
    course: {
      id: 'course-calc',
      code: 'CALC',
      name: 'Calculus',
      credits: 3,
      semester: 1,
      isCompulsory: true,
      status: 'ACTIVE' as any,
    },
    steps: [{ title: 'Step 1', resources: [] }],
    ...overrides,
  } as TutorialQueryItem;
}

function makeConsumeMessage(
  correlationId?: string,
  headers?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    properties: {
      correlationId: correlationId ?? 'corr-test-001',
      headers: headers ?? {},
      messageId: undefined,
    },
    fields: { routingKey: UPLOAD_ROUTINGKEYS.CONTENT_EXTRACTED },
  };
}

function approvedResult(overrides?: Partial<ModerationResult>): ModerationResult {
  return {
    decision: 'APPROVED',
    score: 0.95,
    reasons: ['Content is safe and educational.'],
    ruleVersion: 'v1',
    ...overrides,
  };
}

function rejectedResult(overrides?: Partial<ModerationResult>): ModerationResult {
  return {
    decision: 'REJECTED',
    score: 0.1,
    reasons: ['Spam or low-quality content detected.'],
    ruleVersion: 'v1',
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────

describe('ContentExtractedConsumer', () => {
  let consumer: ContentExtractedConsumer;

  // Mocks
  const mockResourceRepository = {
    findByIdWithDetails: jest.fn(),
    applyModerationResult: jest.fn(),
  };

  const mockTutorialRepository = {
    findByMediaFileIdWithDetails: jest.fn(),
    applyModerationResult: jest.fn(),
  };

  const mockContentModeration = {
    moderate: jest.fn(),
  };

  const mockRecommendationSync = {
    send: jest.fn(),
  };

  const mockIdempotentConsumer = {
    resolveCorrelationId: jest.fn().mockReturnValue('corr-test-001'),
    runWithIdempotency: jest.fn(
      async (_correlationId: string, _routingKey: string, action: () => Promise<void>) => {
        await action();
      },
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Restore default passthrough for runWithIdempotency after error-handling tests mutate it
    mockIdempotentConsumer.resolveCorrelationId.mockReturnValue('corr-test-001');
    mockIdempotentConsumer.runWithIdempotency.mockImplementation(
      async (_correlationId: string, _routingKey: string, action: () => Promise<void>) => {
        await action();
      },
    );

    consumer = new ContentExtractedConsumer(
      mockResourceRepository as any,
      mockTutorialRepository as any,
      mockContentModeration as any,
      mockRecommendationSync as any,
      mockIdempotentConsumer as any,
    );
  });

  // ────────────────────────────────────────────────────────────────
  // Resource moderation
  // ────────────────────────────────────────────────────────────────

  describe('Resource moderation (contentType=RESOURCE)', () => {
    it('should moderate and mark resource APPROVED + send recommendation sync', async () => {
      const payload = makeResourcePayload();
      const resource = makeResourceQueryItem();
      mockResourceRepository.findByIdWithDetails.mockResolvedValue(resource);
      mockContentModeration.moderate.mockResolvedValue(approvedResult());

      const result = await consumer.handleContentExtracted(
        { payload },
        makeConsumeMessage() as any,
      );

      expect(result).toBeUndefined(); // no Nack
      expect(mockResourceRepository.findByIdWithDetails).toHaveBeenCalledWith('res-001');
      expect(mockContentModeration.moderate).toHaveBeenCalledWith(
        expect.objectContaining({
          contentId: 'res-001',
          contentType: 'RESOURCE',
          title: 'Algorithms 101',
          extractedText: 'Educational content about algorithms',
        }),
      );
      expect(mockResourceRepository.applyModerationResult).toHaveBeenCalledWith('res-001', {
        status: ResourceModerationStatus.APPROVED,
        score: 0.95,
        reasons: ['Content is safe and educational.'],
        ruleVersion: 'v1',
      });
      expect(mockRecommendationSync.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ITEM_UPSERT',
          itemId: 'res-001',
          itemType: 'RESOURCE',
          title: 'Algorithms 101',
        }),
      );
    });

    it('should moderate and mark resource REJECTED without sending recommendation sync', async () => {
      const payload = makeResourcePayload();
      const resource = makeResourceQueryItem();
      mockResourceRepository.findByIdWithDetails.mockResolvedValue(resource);
      mockContentModeration.moderate.mockResolvedValue(rejectedResult());

      await consumer.handleContentExtracted({ payload }, makeConsumeMessage() as any);

      expect(mockResourceRepository.applyModerationResult).toHaveBeenCalledWith('res-001', {
        status: ResourceModerationStatus.REJECTED,
        score: 0.1,
        reasons: ['Spam or low-quality content detected.'],
        ruleVersion: 'v1',
      });
      expect(mockRecommendationSync.send).not.toHaveBeenCalled();
    });

    it('should handle NEEDS_REVIEW decision without sync', async () => {
      const payload = makeResourcePayload();
      mockResourceRepository.findByIdWithDetails.mockResolvedValue(makeResourceQueryItem());
      mockContentModeration.moderate.mockResolvedValue(
        approvedResult({ decision: 'NEEDS_REVIEW' }),
      );

      await consumer.handleContentExtracted({ payload }, makeConsumeMessage() as any);

      expect(mockResourceRepository.applyModerationResult).toHaveBeenCalledWith(
        'res-001',
        expect.objectContaining({ status: ResourceModerationStatus.NEEDS_REVIEW }),
      );
      expect(mockRecommendationSync.send).not.toHaveBeenCalled();
    });

    it('should handle ERROR decision without sync', async () => {
      const payload = makeResourcePayload();
      mockResourceRepository.findByIdWithDetails.mockResolvedValue(makeResourceQueryItem());
      mockContentModeration.moderate.mockResolvedValue(approvedResult({ decision: 'ERROR' }));

      await consumer.handleContentExtracted({ payload }, makeConsumeMessage() as any);

      expect(mockResourceRepository.applyModerationResult).toHaveBeenCalledWith(
        'res-001',
        expect.objectContaining({ status: ResourceModerationStatus.ERROR }),
      );
      expect(mockRecommendationSync.send).not.toHaveBeenCalled();
    });

    it('should skip moderation if resource is not found', async () => {
      const payload = makeResourcePayload();
      mockResourceRepository.findByIdWithDetails.mockResolvedValue(null);

      const result = await consumer.handleContentExtracted(
        { payload },
        makeConsumeMessage() as any,
      );

      expect(result).toBeUndefined();
      expect(mockContentModeration.moderate).not.toHaveBeenCalled();
      expect(mockResourceRepository.applyModerationResult).not.toHaveBeenCalled();
      expect(mockRecommendationSync.send).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Tutorial moderation
  // ────────────────────────────────────────────────────────────────

  describe('Tutorial moderation (contentType=TUTORIAL)', () => {
    it('should look up tutorial by media fileId, moderate, and sync on APPROVED', async () => {
      const payload = makeTutorialPayload();
      const tutorial = makeTutorialQueryItem();
      mockTutorialRepository.findByMediaFileIdWithDetails.mockResolvedValue(tutorial);
      mockContentModeration.moderate.mockResolvedValue(approvedResult());

      const result = await consumer.handleContentExtracted(
        { payload },
        makeConsumeMessage() as any,
      );

      expect(result).toBeUndefined();
      // Key assertion: tutorial lookup uses files[0].fileId, NOT contentId
      expect(mockTutorialRepository.findByMediaFileIdWithDetails).toHaveBeenCalledWith('file-t1');
      expect(mockContentModeration.moderate).toHaveBeenCalledWith(
        expect.objectContaining({
          contentId: 'tut-001',
          contentType: 'TUTORIAL',
          title: 'Calculus Tutorial',
          extractedText: 'Transcript of a calculus lecture',
          mediaUrls: [],
        }),
      );
      expect(mockTutorialRepository.applyModerationResult).toHaveBeenCalledWith('tut-001', {
        status: TutorialModerationStatus.APPROVED,
        score: 0.95,
        reasons: ['Content is safe and educational.'],
        ruleVersion: 'v1',
      });
      expect(mockRecommendationSync.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ITEM_UPSERT',
          itemId: 'tut-001',
          itemType: 'TUTORIAL',
          title: 'Calculus Tutorial',
          steps: [{ title: 'Step 1' }],
        }),
      );
    });

    it('should moderate tutorial REJECTED without sync', async () => {
      const payload = makeTutorialPayload();
      mockTutorialRepository.findByMediaFileIdWithDetails.mockResolvedValue(
        makeTutorialQueryItem(),
      );
      mockContentModeration.moderate.mockResolvedValue(rejectedResult());

      await consumer.handleContentExtracted({ payload }, makeConsumeMessage() as any);

      expect(mockTutorialRepository.applyModerationResult).toHaveBeenCalledWith(
        'tut-001',
        expect.objectContaining({ status: TutorialModerationStatus.REJECTED }),
      );
      expect(mockRecommendationSync.send).not.toHaveBeenCalled();
    });

    it('should skip moderation if files array is empty (no fileId)', async () => {
      const payload = makeTutorialPayload({ files: [] });

      const result = await consumer.handleContentExtracted(
        { payload },
        makeConsumeMessage() as any,
      );

      expect(result).toBeUndefined();
      expect(mockTutorialRepository.findByMediaFileIdWithDetails).not.toHaveBeenCalled();
      expect(mockContentModeration.moderate).not.toHaveBeenCalled();
    });

    it('should skip moderation if tutorial is not found by fileId', async () => {
      const payload = makeTutorialPayload();
      mockTutorialRepository.findByMediaFileIdWithDetails.mockResolvedValue(null);

      const result = await consumer.handleContentExtracted(
        { payload },
        makeConsumeMessage() as any,
      );

      expect(result).toBeUndefined();
      expect(mockTutorialRepository.findByMediaFileIdWithDetails).toHaveBeenCalledWith('file-t1');
      expect(mockContentModeration.moderate).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Idempotency
  // ────────────────────────────────────────────────────────────────

  describe('Idempotent handling', () => {
    it('should resolve correlationId from RMQ message and pass to runWithIdempotency', async () => {
      const payload = makeResourcePayload();
      const message = makeConsumeMessage('corr-custom-123');
      mockResourceRepository.findByIdWithDetails.mockResolvedValue(makeResourceQueryItem());
      mockContentModeration.moderate.mockResolvedValue(approvedResult());

      await consumer.handleContentExtracted({ payload }, message as any);

      expect(mockIdempotentConsumer.resolveCorrelationId).toHaveBeenCalledWith(message, 'res-001');
      expect(mockIdempotentConsumer.runWithIdempotency).toHaveBeenCalledWith(
        'corr-test-001',
        UPLOAD_ROUTINGKEYS.CONTENT_EXTRACTED,
        expect.any(Function),
      );
    });

    it('should skip processing on redelivery (idempotency guard blocks)', async () => {
      // Simulate idempotency guard returning without executing the action
      mockIdempotentConsumer.runWithIdempotency.mockResolvedValue(undefined);
      const payload = makeResourcePayload();

      const result = await consumer.handleContentExtracted(
        { payload },
        makeConsumeMessage() as any,
      );

      expect(result).toBeUndefined();
      // The action is never called because runWithIdempotency short-circuits
      expect(mockResourceRepository.findByIdWithDetails).not.toHaveBeenCalled();
      expect(mockContentModeration.moderate).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Error handling
  // ────────────────────────────────────────────────────────────────

  describe('Error handling & retry', () => {
    it('should requeue (Nack(true)) on first failure (no delivery count header)', async () => {
      const payload = makeResourcePayload();
      mockIdempotentConsumer.runWithIdempotency.mockRejectedValue(
        new Error('Moderation provider timeout'),
      );

      const result = await consumer.handleContentExtracted(
        { payload },
        makeConsumeMessage() as any,
      );

      expect(result).toBeInstanceOf(Nack);
      expect((result as Nack).requeue).toBe(true);
    });

    it('should requeue (Nack(true)) when delivery count is below MAX_RETRIES', async () => {
      const payload = makeResourcePayload();
      mockIdempotentConsumer.runWithIdempotency.mockRejectedValue(new Error('Network hiccup'));

      const result = await consumer.handleContentExtracted(
        { payload },
        makeConsumeMessage(undefined, { 'x-delivery-count': 2 }) as any,
      );

      expect(result).toBeInstanceOf(Nack);
      expect((result as Nack).requeue).toBe(true);
    });

    it('should DLQ (Nack(false)) when delivery count reaches MAX_RETRIES', async () => {
      const payload = makeResourcePayload();
      mockIdempotentConsumer.runWithIdempotency.mockRejectedValue(
        new Error('Persistent moderation failure'),
      );

      const result = await consumer.handleContentExtracted(
        { payload },
        makeConsumeMessage(undefined, { 'x-delivery-count': 3 }) as any,
      );

      expect(result).toBeInstanceOf(Nack);
      expect((result as Nack).requeue).toBe(false);
    });

    it('should DLQ (Nack(false)) when repository throws after retries exhausted', async () => {
      const payload = makeResourcePayload();
      mockIdempotentConsumer.runWithIdempotency.mockImplementation(
        async (_corr: string, _key: string, action: () => Promise<void>) => {
          await action();
        },
      );
      mockResourceRepository.findByIdWithDetails.mockRejectedValue(
        new Error('MongoDB connection lost'),
      );

      const result = await consumer.handleContentExtracted(
        { payload },
        makeConsumeMessage(undefined, { 'x-delivery-count': 3 }) as any,
      );

      expect(result).toBeInstanceOf(Nack);
      expect((result as Nack).requeue).toBe(false);
    });

    it('should count retries from x-death headers on classic queues', async () => {
      const payload = makeResourcePayload();
      mockIdempotentConsumer.runWithIdempotency.mockRejectedValue(new Error('Transient'));

      // x-death with count=3 → retries exhausted
      const result = await consumer.handleContentExtracted(
        { payload },
        makeConsumeMessage(undefined, {
          'x-death': [
            {
              count: 3,
              reason: 'rejected',
              queue: 'q',
              exchange: 'e',
              'routing-keys': [],
              time: { '!': 'timestamp', value: 0 },
            },
          ],
        }) as any,
      );

      expect(result).toBeInstanceOf(Nack);
      expect((result as Nack).requeue).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Extracted text aggregation
  // ────────────────────────────────────────────────────────────────

  describe('Extracted text aggregation', () => {
    it('should join extracted text from multiple files', async () => {
      const payload = makeResourcePayload({
        files: [
          {
            fileId: 'file-r1',
            s3Key: 'docs/res-001/file-r1.pdf',
            downloadUrl: 'https://cdn.example/file-r1',
            mimeType: 'application/pdf',
            originalFilename: 'ch1.pdf',
            extractedText: 'Chapter 1 content',
            extractionStatus: 'AVAILABLE',
            extractionError: null,
          },
          {
            fileId: 'file-r2',
            s3Key: 'docs/res-001/file-r2.pdf',
            downloadUrl: 'https://cdn.example/file-r2',
            mimeType: 'application/pdf',
            originalFilename: 'ch2.pdf',
            extractedText: 'Chapter 2 content',
            extractionStatus: 'AVAILABLE',
            extractionError: null,
          },
        ],
      });
      mockResourceRepository.findByIdWithDetails.mockResolvedValue(makeResourceQueryItem());
      mockContentModeration.moderate.mockResolvedValue(approvedResult());

      await consumer.handleContentExtracted({ payload }, makeConsumeMessage() as any);

      expect(mockContentModeration.moderate).toHaveBeenCalledWith(
        expect.objectContaining({
          extractedText: 'Chapter 1 content\n\nChapter 2 content',
        }),
      );
    });

    it('should filter out empty/null extracted text entries', async () => {
      const payload = makeResourcePayload({
        files: [
          {
            fileId: 'file-r1',
            s3Key: 'docs/res-001/file-r1.pdf',
            downloadUrl: 'https://cdn.example/file-r1',
            mimeType: 'application/pdf',
            originalFilename: 'ch1.pdf',
            extractedText: 'Chapter 1 content',
            extractionStatus: 'AVAILABLE',
            extractionError: null,
          },
          {
            fileId: 'file-r2',
            s3Key: 'docs/res-001/file-r2.pdf',
            downloadUrl: null,
            mimeType: 'application/pdf',
            originalFilename: 'ch2.pdf',
            extractedText: null,
            extractionStatus: 'UNSUPPORTED',
            extractionError: 'Unsupported format',
          },
          {
            fileId: 'file-r3',
            s3Key: 'docs/res-001/file-r3.pdf',
            downloadUrl: null,
            mimeType: 'application/pdf',
            originalFilename: 'ch3.pdf',
            extractedText: '   ',
            extractionStatus: 'FAILED',
            extractionError: 'Empty result',
          },
        ],
      });
      mockResourceRepository.findByIdWithDetails.mockResolvedValue(makeResourceQueryItem());
      mockContentModeration.moderate.mockResolvedValue(approvedResult());

      await consumer.handleContentExtracted({ payload }, makeConsumeMessage() as any);

      expect(mockContentModeration.moderate).toHaveBeenCalledWith(
        expect.objectContaining({
          extractedText: 'Chapter 1 content',
          extractionStatus: 'PARTIAL',
          extractionError: 'Unsupported format; Empty result',
        }),
      );
    });

    it('should collect download URLs and filter out nulls for resource media', async () => {
      const payload = makeResourcePayload({
        files: [
          {
            fileId: 'file-r1',
            s3Key: 'docs/res-001/file-r1.pdf',
            downloadUrl: 'https://cdn.example/file-r1',
            mimeType: 'application/pdf',
            originalFilename: 'f1.pdf',
            extractedText: 'text',
            extractionStatus: 'AVAILABLE',
            extractionError: null,
          },
          {
            fileId: 'file-r2',
            s3Key: 'docs/res-001/file-r2.pdf',
            downloadUrl: null,
            mimeType: 'application/pdf',
            originalFilename: 'f2.pdf',
            extractedText: 'text',
            extractionStatus: 'AVAILABLE',
            extractionError: null,
          },
        ],
      });
      mockResourceRepository.findByIdWithDetails.mockResolvedValue(makeResourceQueryItem());
      mockContentModeration.moderate.mockResolvedValue(approvedResult());

      await consumer.handleContentExtracted({ payload }, makeConsumeMessage() as any);

      expect(mockContentModeration.moderate).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaUrls: ['https://cdn.example/file-r1'],
        }),
      );
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Status mapping
  // ────────────────────────────────────────────────────────────────

  describe('Status mapping', () => {
    it.each([
      ['APPROVED', ResourceModerationStatus.APPROVED],
      ['REJECTED', ResourceModerationStatus.REJECTED],
      ['ERROR', ResourceModerationStatus.ERROR],
      ['NEEDS_REVIEW', ResourceModerationStatus.NEEDS_REVIEW],
    ] as const)('should map resource decision %s → %s', async (decision, expectedStatus) => {
      const payload = makeResourcePayload();
      mockResourceRepository.findByIdWithDetails.mockResolvedValue(makeResourceQueryItem());
      mockContentModeration.moderate.mockResolvedValue(
        approvedResult({ decision: decision as any }),
      );

      await consumer.handleContentExtracted({ payload }, makeConsumeMessage() as any);

      expect(mockResourceRepository.applyModerationResult).toHaveBeenCalledWith(
        'res-001',
        expect.objectContaining({ status: expectedStatus }),
      );
    });

    it.each([
      ['APPROVED', TutorialModerationStatus.APPROVED],
      ['REJECTED', TutorialModerationStatus.REJECTED],
      ['ERROR', TutorialModerationStatus.ERROR],
      ['NEEDS_REVIEW', TutorialModerationStatus.NEEDS_REVIEW],
    ] as const)('should map tutorial decision %s → %s', async (decision, expectedStatus) => {
      const payload = makeTutorialPayload();
      mockTutorialRepository.findByMediaFileIdWithDetails.mockResolvedValue(
        makeTutorialQueryItem(),
      );
      mockContentModeration.moderate.mockResolvedValue(
        approvedResult({ decision: decision as any }),
      );

      await consumer.handleContentExtracted({ payload }, makeConsumeMessage() as any);

      expect(mockTutorialRepository.applyModerationResult).toHaveBeenCalledWith(
        'tut-001',
        expect.objectContaining({ status: expectedStatus }),
      );
    });

    it('should map unknown decision to NEEDS_REVIEW for resource', async () => {
      const payload = makeResourcePayload();
      mockResourceRepository.findByIdWithDetails.mockResolvedValue(makeResourceQueryItem());
      mockContentModeration.moderate.mockResolvedValue(
        approvedResult({ decision: 'UNKNOWN_VALUE' as any }),
      );

      await consumer.handleContentExtracted({ payload }, makeConsumeMessage() as any);

      expect(mockResourceRepository.applyModerationResult).toHaveBeenCalledWith(
        'res-001',
        expect.objectContaining({ status: ResourceModerationStatus.NEEDS_REVIEW }),
      );
    });
  });
});
