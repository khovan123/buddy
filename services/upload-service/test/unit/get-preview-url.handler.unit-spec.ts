/// <reference types="jest" />

import 'reflect-metadata';

jest.mock('../../src/infrastructure/persistence/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PreviewStatus } from '@libs/contracts';

import { GetPreviewUrlHandler } from '../../src/application/queries/handlers/get-preview-url.handler';
import { GetPreviewUrlQuery } from '../../src/application/queries/get-preview-url.query';
import type { PreviewProcessorContext } from '../../src/domain/services/preview-processor.context';
import type { S3Service } from '../../src/infrastructure/persistence/aws/s3.service';
import type { PrismaService } from '../../src/infrastructure/persistence/prisma/prisma.service';

describe('GetPreviewUrlHandler', () => {
  beforeAll(() => {
    process.env.LOG_LEVEL ??= 'debug';
    process.env.SERVICE_NAME ??= 'upload-service';
  });

  it('signs available generated previews with the generated preview MIME type', async () => {
    const prisma = {
      client: {
        mediaFile: {
          findFirst: jest.fn(async () => ({
            id: 'file-1',
            previewS3Key: 'previews/30pct/resources/file.docx',
            previewStatus: 'AVAILABLE',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          })),
        },
      },
    } as unknown as PrismaService;
    const s3Service = {
      generatePreviewSignedUrl: jest.fn(async () => 'https://signed.example/preview'),
    } as unknown as S3Service;
    const previewProcessor = {
      getPreviewMimeType: jest.fn(() => 'text/plain; charset=utf-8'),
      isSupported: jest.fn(),
    } as unknown as PreviewProcessorContext;
    const previewQueue = { add: jest.fn() };
    const handler = new GetPreviewUrlHandler(
      prisma,
      s3Service,
      previewProcessor,
      previewQueue as never,
    );

    const result = await handler.execute(new GetPreviewUrlQuery('resources/file.docx'));

    expect(result.status).toBe(PreviewStatus.AVAILABLE);
    expect(s3Service.generatePreviewSignedUrl).toHaveBeenCalledWith(
      'previews/30pct/resources/file.docx',
      'text/plain; charset=utf-8',
    );
    expect(previewQueue.add).not.toHaveBeenCalled();
  });
});
