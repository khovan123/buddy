/// <reference types="jest" />

import 'reflect-metadata';

import { GetLibraryTutorialBySlugHandler } from '../../src/application/queries/handlers/get-library-tutorial-by-slug.handler';
import { GetLibraryTutorialBySlugQuery } from '../../src/application/queries/get-library-tutorial-by-slug.query';
import type { ITutorialRepository } from '../../src/domain/repositories/tutorial.repository.interface';
import type { StorageBrokerPublisher } from '../../src/infrastructure/messaging/publishers/storage-broker.rpc';
import type { UserServicePublisher } from '../../src/infrastructure/messaging/publishers/user-service.rpc';
import {
  ContentModerationStatus,
  TutorialStatus,
} from '../../src/infrastructure/persistence/mongo/schemas/tutorial.schema';

describe('GetLibraryTutorialBySlugHandler', () => {
  it('refreshes media.videoUrl with a signed full source URL for library detail responses', async () => {
    const tutorial = {
      id: 'tutorial-1',
      userId: 'user-1',
      title: 'SQL Fundamentals Guide',
      slug: 'sql-fundamentals-guide',
      description: 'SQL basics',
      hightlights: [],
      majorId: 'major-1',
      courseId: 'course-1',
      media: {
        fileId: 'file-1',
        videoUrl: null,
        streamingUrl: 'https://private.example/hls/index.m3u8',
        trailerUrl: 'https://trailer.example/trailer.mp4',
        duration: 77,
        fileSize: 7285769,
        extension: '.mp4',
      },
      price: 0,
      isVerified: true,
      status: TutorialStatus.AVAILABLE,
      moderationStatus: ContentModerationStatus.APPROVED,
      moderationReasons: [],
      discountBundle: 0,
      resourceIds: [],
      collectionIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { tutorialOrders: 0 },
    };
    const tutorialRepository = {
      findBySlugWithDetails: jest.fn(async () => tutorial),
    } as unknown as ITutorialRepository;
    const userServicePublisher = {
      enrichWithUploaders: jest.fn(async (items) => items),
    } as unknown as UserServicePublisher;
    const storageBrokerPublisher = {
      getUploadHistoryByContent: jest.fn(async () => [
        {
          id: 'file-1',
          contentId: 'tutorial-1',
          contentType: 'TUTORIAL',
          s3Key: 'docs/tutorial-1/video.mp4',
        },
      ]),
      getPreviewUrl: jest.fn(async () => ({
        previewUrl: 'https://signed.example/video.mp4',
        isReady: true,
        isPreview: false,
        previewPercentage: 100,
        status: 'AVAILABLE',
      })),
    } as unknown as StorageBrokerPublisher;
    const handler = new GetLibraryTutorialBySlugHandler(
      tutorialRepository,
      userServicePublisher,
      storageBrokerPublisher,
    );

    const result = await handler.execute(
      new GetLibraryTutorialBySlugQuery('sql-fundamentals-guide'),
    );

    expect(result?.media.videoUrl).toBe('https://signed.example/video.mp4');
    expect(storageBrokerPublisher.getUploadHistoryByContent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { contentId: 'tutorial-1' },
      }),
    );
    expect(storageBrokerPublisher.getPreviewUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          s3Key: 'docs/tutorial-1/video.mp4',
          fullAccess: true,
        },
      }),
    );
  });
});
