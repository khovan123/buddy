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

  it('serves the original file when full access is requested', async () => {
    const prisma = {
      client: {
        mediaFile: {
          findFirst: jest.fn(async () => ({
            id: 'file-0',
            previewS3Key: 'previews/30pct/resources/file.docx',
            previewStatus: 'AVAILABLE',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            originalFilename: 'file.docx',
            updatedAt: new Date(),
          })),
          update: jest.fn(),
        },
      },
    } as unknown as PrismaService;
    const s3Service = {
      generatePreviewSignedUrl: jest.fn(async () => 'https://signed.example/original.docx'),
    } as unknown as S3Service;
    const previewProcessor = {
      getPreviewMimeType: jest.fn(),
      isSupported: jest.fn(),
    } as unknown as PreviewProcessorContext;
    const previewQueue = { add: jest.fn() };
    const handler = new GetPreviewUrlHandler(
      prisma,
      s3Service,
      previewProcessor,
      previewQueue as never,
    );

    const result = await handler.execute(
      new GetPreviewUrlQuery('resources/resource-1/file.docx', true),
    );

    expect(result).toEqual({
      previewUrl: 'https://signed.example/original.docx',
      isReady: true,
      isPreview: false,
      previewPercentage: 100,
      status: PreviewStatus.AVAILABLE,
    });
    expect(s3Service.generatePreviewSignedUrl).toHaveBeenCalledWith(
      'resources/resource-1/file.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(previewProcessor.getPreviewMimeType).not.toHaveBeenCalled();
    expect(previewQueue.add).not.toHaveBeenCalled();
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

  it('marks stale processing previews as failed internally and serves original fallback', async () => {
    const prisma = {
      client: {
        mediaFile: {
          findFirst: jest.fn(async () => ({
            id: 'file-2',
            previewS3Key: null,
            previewStatus: 'PROCESSING',
            mimeType: 'application/pdf',
            originalFilename: 'notes.pdf',
            updatedAt: new Date(Date.now() - 11 * 60 * 1000),
          })),
          update: jest.fn(async () => undefined),
        },
      },
    } as unknown as PrismaService;
    const s3Service = {
      generatePreviewSignedUrl: jest.fn(async () => 'https://signed.example/original.pdf'),
    } as unknown as S3Service;
    const previewProcessor = {
      getPreviewMimeType: jest.fn(),
      isSupported: jest.fn(),
    } as unknown as PreviewProcessorContext;
    const previewQueue = { add: jest.fn() };
    const handler = new GetPreviewUrlHandler(
      prisma,
      s3Service,
      previewProcessor,
      previewQueue as never,
    );

    const result = await handler.execute(new GetPreviewUrlQuery('resources/file.pdf'));

    expect(result.status).toBe(PreviewStatus.AVAILABLE);
    expect(result.previewUrl).toBe('https://signed.example/original.pdf');
    expect(s3Service.generatePreviewSignedUrl).toHaveBeenCalledWith(
      'resources/file.pdf',
      'application/pdf',
    );
    expect(prisma.client.mediaFile.update).toHaveBeenCalledWith({
      where: { id: 'file-2' },
      data: {
        previewStatus: 'FAILED',
        processingError: 'Preview generation timed out.',
      },
    });
    expect(previewQueue.add).toHaveBeenCalledWith('generate-preview', { fileId: 'file-2' });
  });

  it('requeues failed previews and serves original fallback while preview file is regenerated', async () => {
    const prisma = {
      client: {
        mediaFile: {
          findFirst: jest.fn(async () => ({
            id: 'file-3',
            previewS3Key: null,
            previewStatus: 'FAILED',
            mimeType: 'application/pdf',
            originalFilename: 'notes.pdf',
            updatedAt: new Date(),
          })),
          update: jest.fn(async () => undefined),
        },
      },
    } as unknown as PrismaService;
    const s3Service = {
      generatePreviewSignedUrl: jest.fn(async () => 'https://signed.example/original.pdf'),
    } as unknown as S3Service;
    const previewProcessor = {
      getPreviewMimeType: jest.fn(),
      isSupported: jest.fn(),
    } as unknown as PreviewProcessorContext;
    const previewQueue = { add: jest.fn() };
    const handler = new GetPreviewUrlHandler(
      prisma,
      s3Service,
      previewProcessor,
      previewQueue as never,
    );

    const result = await handler.execute(new GetPreviewUrlQuery('resources/file.pdf'));

    expect(result.status).toBe(PreviewStatus.AVAILABLE);
    expect(result.previewUrl).toBe('https://signed.example/original.pdf');
    expect(previewQueue.add).toHaveBeenCalledWith('generate-preview', { fileId: 'file-3' });
  });

  it('serves original fallback while preview generation is still processing', async () => {
    const prisma = {
      client: {
        mediaFile: {
          findFirst: jest.fn(async () => ({
            id: 'file-processing',
            previewS3Key: null,
            previewStatus: 'PROCESSING',
            mimeType: 'application/pdf',
            originalFilename: 'notes.pdf',
            updatedAt: new Date(),
          })),
        },
      },
    } as unknown as PrismaService;
    const s3Service = {
      generatePreviewSignedUrl: jest.fn(async () => 'https://signed.example/processing.pdf'),
    } as unknown as S3Service;
    const previewProcessor = {
      getPreviewMimeType: jest.fn(),
      isSupported: jest.fn(),
    } as unknown as PreviewProcessorContext;
    const previewQueue = { add: jest.fn() };
    const handler = new GetPreviewUrlHandler(
      prisma,
      s3Service,
      previewProcessor,
      previewQueue as never,
    );

    const result = await handler.execute(new GetPreviewUrlQuery('resources/processing.pdf'));

    expect(result.status).toBe(PreviewStatus.AVAILABLE);
    expect(result.previewUrl).toBe('https://signed.example/processing.pdf');
    expect(previewQueue.add).not.toHaveBeenCalled();
  });

  it('uses filename extension fallback when MIME type is generic', async () => {
    const prisma = {
      client: {
        mediaFile: {
          findFirst: jest.fn(async () => ({
            id: 'file-4',
            previewS3Key: null,
            previewStatus: 'PENDING',
            mimeType: 'application/octet-stream',
            originalFilename: 'lesson.md',
            updatedAt: new Date(),
          })),
          update: jest.fn(async () => undefined),
        },
      },
    } as unknown as PrismaService;
    const s3Service = {
      generatePreviewSignedUrl: jest.fn(async () => 'https://signed.example/lesson.md'),
    } as unknown as S3Service;
    const previewProcessor = {
      getPreviewMimeType: jest.fn(),
    } as unknown as PreviewProcessorContext;
    const previewQueue = { add: jest.fn() };
    const handler = new GetPreviewUrlHandler(
      prisma,
      s3Service,
      previewProcessor,
      previewQueue as never,
    );

    const result = await handler.execute(new GetPreviewUrlQuery('resources/lesson.md'));

    expect(result.status).toBe(PreviewStatus.AVAILABLE);
    expect(result.previewUrl).toBe('https://signed.example/lesson.md');
    expect(previewQueue.add).toHaveBeenCalledWith('generate-preview', { fileId: 'file-4' });
  });

  it('queues a placeholder preview file when preview format is unsupported', async () => {
    const prisma = {
      client: {
        mediaFile: {
          findFirst: jest.fn(async () => ({
            id: 'file-5',
            previewS3Key: null,
            previewStatus: 'PENDING',
            mimeType: 'application/zip',
            originalFilename: 'archive.zip',
            updatedAt: new Date(),
          })),
          update: jest.fn(async () => undefined),
        },
      },
    } as unknown as PrismaService;
    const s3Service = {
      generatePreviewSignedUrl: jest.fn(async () => 'https://signed.example/archive.zip'),
    } as unknown as S3Service;
    const previewProcessor = {
      getPreviewMimeType: jest.fn(),
    } as unknown as PreviewProcessorContext;
    const previewQueue = { add: jest.fn() };
    const handler = new GetPreviewUrlHandler(
      prisma,
      s3Service,
      previewProcessor,
      previewQueue as never,
    );

    const result = await handler.execute(new GetPreviewUrlQuery('resources/archive.zip'));

    expect(result.status).toBe(PreviewStatus.AVAILABLE);
    expect(result.previewUrl).toBe('https://signed.example/archive.zip');
    expect(previewQueue.add).toHaveBeenCalledWith('generate-preview', { fileId: 'file-5' });
  });
});
