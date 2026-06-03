/// <reference types="jest" />

import 'reflect-metadata';

import { ThumbnailUploadedConsumer } from '../../src/infrastructure/messaging/consumers/thumbnail-uploaded.consumer';

describe('ThumbnailUploadedConsumer', () => {
  const createConsumer = () =>
    new ThumbnailUploadedConsumer(
      {} as never,
      {} as never,
      {
        resolveCorrelationId: jest.fn(),
        runWithIdempotency: jest.fn(),
      } as never,
    );

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
