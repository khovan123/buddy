/// <reference types="jest" />

import 'reflect-metadata';

import { UploadType } from '@libs/contracts';

import { GetUploadUrlHandler } from '../../src/application/queries/handlers/get-upload-url.handler';
import { GetUploadUrlQuery } from '../../src/application/queries/get-upload-url.query';

describe('GetUploadUrlHandler', () => {
  beforeAll(() => {
    process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'silent';
    process.env.SERVICE_NAME = process.env.SERVICE_NAME ?? 'upload-service-test';
  });

  const makeHandler = () => {
    const storageProvider = {
      generatePresignedUploadUrl: jest.fn(async () => ({
        fileKey: 'docs/resource-1/file.pdf',
        uploadUrl: 'https://signed.example/upload',
        bucket: 'resources',
        mimeType: 'application/pdf',
      })),
    };
    const fileRepository = {
      createPending: jest.fn(async () => ({
        id: 'file-1',
      })),
    };
    const videoQueue = {
      count: jest.fn(async () => 0),
    };

    return {
      handler: new GetUploadUrlHandler(
        storageProvider as never,
        fileRepository as never,
        videoQueue as never,
      ),
      storageProvider,
      fileRepository,
      videoQueue,
    };
  };

  it('accepts PDF resource files when generating presigned upload URLs', async () => {
    const { handler, storageProvider, fileRepository } = makeHandler();

    const result = await handler.execute(
      new GetUploadUrlQuery(
        'lecture-notes.pdf',
        2048,
        'application/pdf',
        UploadType.RESOURCE,
        'user-1',
        'resource-1',
        'RESOURCE',
        'docs/resource-1',
      ),
    );

    expect(result).toEqual(
      expect.objectContaining({
        fileId: 'file-1',
        fileName: 'lecture-notes.pdf',
        mimeType: 'application/pdf',
        s3Key: 'docs/resource-1/file.pdf',
        uploadUrl: 'https://signed.example/upload',
      }),
    );
    expect(storageProvider.generatePresignedUploadUrl).toHaveBeenCalledWith(
      'lecture-notes.pdf',
      UploadType.RESOURCE,
      'docs/resource-1',
    );
    expect(fileRepository.createPending).toHaveBeenCalledWith(
      expect.objectContaining({
        originalFilename: 'lecture-notes.pdf',
        mimeType: 'application/pdf',
        contentId: 'resource-1',
        contentType: 'RESOURCE',
      }),
    );
  });
});
