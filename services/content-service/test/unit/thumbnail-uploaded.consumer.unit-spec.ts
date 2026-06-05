/// <reference types="jest" />

import 'reflect-metadata';

import { ThumbnailUploadedConsumer } from '../../src/infrastructure/messaging/consumers/thumbnail-uploaded.consumer';

describe('ThumbnailUploadedConsumer', () => {
  const resourceRepository = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  const collectionRepository = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  const idempotentConsumer = {
    resolveCorrelationId: jest.fn(),
    runWithIdempotency: jest.fn(),
  };

  const createConsumer = () =>
    new ThumbnailUploadedConsumer(
      resourceRepository as never,
      collectionRepository as never,
      idempotentConsumer as never,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    idempotentConsumer.resolveCorrelationId.mockReturnValue('corr-test');
    idempotentConsumer.runWithIdempotency.mockImplementation(
      async (_correlationId: string, _routingKey: string, action: () => Promise<void>) => {
        await action();
        return true;
      },
    );
  });

  it('updates resource thumbnails from wrapped upload success payloads', async () => {
    const consumer = createConsumer();
    const resource = { id: 'resource-1', thumbnailUrl: undefined };
    resourceRepository.findById.mockResolvedValue(resource);

    await consumer.handleThumbnailUploaded(
      {
        pattern: 'upload.thumbnail.uploaded',
        data: {
          payload: {
            contentId: 'resource-1',
            contentType: 'resource',
            thumbnailUrl: 'https://cdn.example/thumb.jpg',
          },
        },
      } as never,
      { properties: {} } as never,
    );

    expect(resourceRepository.findById).toHaveBeenCalledWith('resource-1');
    expect(resource.thumbnailUrl).toBe('https://cdn.example/thumb.jpg');
    expect(resourceRepository.update).toHaveBeenCalledWith(resource);
  });

  it('logs a fallback reason for thumbnail upload failures without reason', async () => {
    const consumer = createConsumer();
    const warnSpy = jest.spyOn(
      (consumer as never as { logger: { warn: jest.Mock } }).logger,
      'warn',
    );
    warnSpy.mockImplementation(jest.fn());

    await consumer.handleThumbnailUploadFailed(
      {
        contentId: 'resource-1',
        contentType: 'resource',
      } as never,
      {} as never,
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('reason=Unknown thumbnail upload failure'),
    );
  });

  it('reads alternate error fields from malformed thumbnail failure payloads', async () => {
    const consumer = createConsumer();
    const warnSpy = jest.spyOn(
      (consumer as never as { logger: { warn: jest.Mock } }).logger,
      'warn',
    );
    warnSpy.mockImplementation(jest.fn());

    await consumer.handleThumbnailUploadFailed(
      {
        data: {
          payload: {
            contentId: 'resource-1',
            contentType: 'resource',
            error: 'Cloudinary rejected the file',
          },
        },
      } as never,
      {} as never,
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('reason=Cloudinary rejected the file'),
    );
  });
});
