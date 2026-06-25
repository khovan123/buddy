/// <reference types="jest" />

import 'reflect-metadata';

import { BadRequestException } from '@nestjs/common';

import { CreateResourceCommand } from '../../src/application/commands/create-resource.command';
import { CreateResourceHanlder } from '../../src/application/commands/handlers/create-resource.handler';

describe('CreateResourceHanlder', () => {
  const makeHandler = () => {
    const resourceRepository = {
      findBySlug: jest.fn(async () => null),
      save: jest.fn(async () => undefined),
      update: jest.fn(async () => undefined),
      delete: jest.fn(async () => undefined),
    };
    const collectionRepository = {
      findByIdWithType: jest.fn(),
    };
    const contentValidationService = {
      validateMajorExists: jest.fn(async () => undefined),
      validateCourseExists: jest.fn(async () => undefined),
    };
    const storageBrokerPublisher = {
      getPresignedUrls: jest.fn(async () => ({
        uploadUrls: [
          {
            fileId: 'file-pdf',
            s3Key: 'docs/resource-1/lecture-notes.pdf',
            uploadUrl: 'https://signed.example/upload',
            fileName: 'lecture-notes.pdf',
            fileSizeBytes: 2048,
            mimeType: 'application/pdf',
            estimatedTime: 1,
          },
        ],
      })),
      emitThumbnailUpload: jest.fn(),
    };

    return {
      handler: new CreateResourceHanlder(
        resourceRepository as never,
        collectionRepository as never,
        contentValidationService as never,
        storageBrokerPublisher as never,
      ),
      resourceRepository,
      storageBrokerPublisher,
    };
  };

  it('accepts PDF resource files and stores the PDF extension metadata', async () => {
    const { handler, resourceRepository, storageBrokerPublisher } = makeHandler();

    const result = await handler.execute(
      new CreateResourceCommand(
        'user-1',
        'Lecture Notes',
        'Helpful lecture notes for students.',
        ['Detailed examples for learners.'],
        '64f0f0f0f0f0f0f0f0f0f0f0',
        '64f0f0f0f0f0f0f0f0f0f0f1',
        0,
        [
          {
            fileName: 'lecture-notes.pdf',
            fileSizeBytes: 2048,
            mimeType: 'application/pdf',
          },
        ],
      ),
    );

    expect(result.uploadUrls[0].mimeType).toBe('application/pdf');
    expect(storageBrokerPublisher.getPresignedUrls).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          files: [
            {
              fileName: 'lecture-notes.pdf',
              fileSizeBytes: 2048,
              mimeType: 'application/pdf',
            },
          ],
        }),
      }),
    );
    const updatedResource = resourceRepository.update.mock.calls[0]?.[0];
    expect(updatedResource.meta[0].extension).toBe('.pdf');
  });

  it('rejects unsupported resource file extensions', async () => {
    const { handler, storageBrokerPublisher } = makeHandler();

    await expect(
      handler.execute(
        new CreateResourceCommand(
          'user-1',
          'Lecture Notes',
          'Helpful lecture notes for students.',
          ['Detailed examples for learners.'],
          '64f0f0f0f0f0f0f0f0f0f0f0',
          '64f0f0f0f0f0f0f0f0f0f0f1',
          0,
          [
            {
              fileName: 'archive.zip',
              fileSizeBytes: 2048,
              mimeType: 'application/zip',
            },
          ],
        ),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(storageBrokerPublisher.getPresignedUrls).not.toHaveBeenCalled();
  });
});
