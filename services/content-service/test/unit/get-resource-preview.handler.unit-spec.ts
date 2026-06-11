/// <reference types="jest" />

import 'reflect-metadata';

import { PreviewStatus } from '@libs/contracts';

import { GetResourcePreviewHandler } from '../../src/application/queries/handlers/get-resource-preview.handler';
import { GetResourcePreviewQuery } from '../../src/application/queries/get-resource-preview.query';
import type { IResourceRepository } from '../../src/domain/repositories/resource.repository.interface';
import {
  ContentModerationStatus,
  ResourceStatus,
} from '../../src/infrastructure/persistence/mongo/schemas/resource.schema';
import type { StorageBrokerPublisher } from '../../src/infrastructure/messaging/publishers/storage-broker.rpc';

function makeResource(overrides: Record<string, unknown> = {}) {
  return {
    id: 'resource-1',
    userId: 'user-1',
    title: 'System Design Notes',
    slug: 'system-design-notes',
    summary: 'Notes',
    hightlights: [],
    majorId: 'major-1',
    courseId: 'course-1',
    price: 1000,
    status: ResourceStatus.AVAILABLE,
    moderationStatus: ContentModerationStatus.APPROVED,
    moderationReasons: [],
    resourceVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    primaryS3Key: 'resources/resource-1/notes.docx',
    primaryFileExtension: '.docx',
    _count: { resourceMeta: 1, resourceOrders: 0 },
    ...overrides,
  };
}

describe('GetResourcePreviewHandler', () => {
  it('returns the primary file format from resource metadata', async () => {
    const resourceRepository = {
      findBySlugWithDetails: jest.fn(async () => makeResource()),
    } as unknown as IResourceRepository;
    const storageBroker = {
      getPreviewUrl: jest.fn(async () => ({
        previewUrl: 'https://signed.example/preview',
        isReady: true,
        isPreview: true,
        previewPercentage: 30,
        status: PreviewStatus.AVAILABLE,
      })),
    } as unknown as StorageBrokerPublisher;
    const handler = new GetResourcePreviewHandler(resourceRepository, storageBroker);

    const result = await handler.execute(new GetResourcePreviewQuery('system-design-notes'));

    expect(result?.format).toBe('DOCX');
    expect(storageBroker.getPreviewUrl).toHaveBeenCalledTimes(1);
  });

  it('falls back to the primary S3 key extension when the metadata extension is absent', async () => {
    const resourceRepository = {
      findBySlugWithDetails: jest.fn(async () =>
        makeResource({
          primaryFileExtension: null,
          primaryS3Key: 'resources/resource-1/notes.txt',
        }),
      ),
    } as unknown as IResourceRepository;
    const storageBroker = {
      getPreviewUrl: jest.fn(async () => ({
        previewUrl: null,
        isReady: false,
        isPreview: true,
        previewPercentage: 30,
        status: PreviewStatus.PROCESSING,
      })),
    } as unknown as StorageBrokerPublisher;
    const handler = new GetResourcePreviewHandler(resourceRepository, storageBroker);

    const result = await handler.execute(new GetResourcePreviewQuery('system-design-notes'));

    expect(result?.format).toBe('TXT');
  });

  it('returns an available placeholder preview when primary S3 key is missing', async () => {
    const resourceRepository = {
      findBySlugWithDetails: jest.fn(async () =>
        makeResource({
          primaryS3Key: null,
        }),
      ),
    } as unknown as IResourceRepository;
    const storageBroker = {
      getPreviewUrl: jest.fn(),
    } as unknown as StorageBrokerPublisher;
    const handler = new GetResourcePreviewHandler(resourceRepository, storageBroker);

    const result = await handler.execute(new GetResourcePreviewQuery('system-design-notes'));

    expect(result?.status).toBe(PreviewStatus.AVAILABLE);
    expect(result?.previewUrl).toContain('data:text/markdown');
    expect(storageBroker.getPreviewUrl).not.toHaveBeenCalled();
  });

  it('returns an available placeholder preview when upload preview RPC fails', async () => {
    const resourceRepository = {
      findBySlugWithDetails: jest.fn(async () => makeResource()),
    } as unknown as IResourceRepository;
    const storageBroker = {
      getPreviewUrl: jest.fn(async () => {
        throw new Error('upload-service unavailable');
      }),
    } as unknown as StorageBrokerPublisher;
    const handler = new GetResourcePreviewHandler(resourceRepository, storageBroker);

    const result = await handler.execute(new GetResourcePreviewQuery('system-design-notes'));

    expect(result?.status).toBe(PreviewStatus.AVAILABLE);
    expect(result?.previewUrl).toContain('data:text/markdown');
  });
});
