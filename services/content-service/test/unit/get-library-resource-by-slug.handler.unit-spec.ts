/// <reference types="jest" />

import 'reflect-metadata';

import { GetLibraryResourceBySlugHandler } from '../../src/application/queries/handlers/get-library-resource-by-slug.handler';
import { GetLibraryResourceBySlugQuery } from '../../src/application/queries/get-library-resource-by-slug.query';
import type { IResourceRepository } from '../../src/domain/repositories/resource.repository.interface';
import type { StorageBrokerPublisher } from '../../src/infrastructure/messaging/publishers/storage-broker.rpc';
import type { UserServicePublisher } from '../../src/infrastructure/messaging/publishers/user-service.rpc';
import {
  ContentModerationStatus,
  ResourceStatus,
} from '../../src/infrastructure/persistence/mongo/schemas/resource.schema';

describe('GetLibraryResourceBySlugHandler', () => {
  it('refreshes the primary file download URL for library detail responses', async () => {
    const resource = {
      id: 'resource-1',
      userId: 'user-1',
      title: 'SQL Fundamentals Guide',
      slug: 'sql-fundamentals-guide-1',
      summary: 'SQL basics',
      hightlights: [],
      majorId: 'major-1',
      courseId: 'course-1',
      price: 0,
      status: ResourceStatus.AVAILABLE,
      moderationStatus: ContentModerationStatus.APPROVED,
      moderationReasons: [],
      resourceVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      meta: [
        {
          fileId: 'file-1',
          s3Key: 'docs/resource-1/sql.docx',
          downloadUrl: '',
          fileSize: 1234,
          extension: '.docx',
        },
      ],
      primaryS3Key: 'docs/resource-1/sql.docx',
      primaryFileExtension: '.docx',
      _count: { resourceMeta: 1, resourceOrders: 0 },
    };
    const resourceRepository = {
      findBySlugWithDetails: jest.fn(async () => resource),
    } as unknown as IResourceRepository;
    const userServicePublisher = {
      enrichWithUploaders: jest.fn(async (items) => items),
    } as unknown as UserServicePublisher;
    const storageBrokerPublisher = {
      getPreviewUrl: jest.fn(async () => ({
        previewUrl: 'https://signed.example/sql.docx',
        isReady: true,
        isPreview: false,
        previewPercentage: 100,
        status: 'AVAILABLE',
      })),
    } as unknown as StorageBrokerPublisher;
    const handler = new GetLibraryResourceBySlugHandler(
      resourceRepository,
      userServicePublisher,
      storageBrokerPublisher,
    );

    const result = await handler.execute(
      new GetLibraryResourceBySlugQuery('sql-fundamentals-guide-1'),
    );

    expect(result?.meta[0]?.downloadUrl).toBe('https://signed.example/sql.docx');
    expect(storageBrokerPublisher.getPreviewUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          s3Key: 'docs/resource-1/sql.docx',
          fullAccess: true,
        },
      }),
    );
  });
});
