/// <reference types="jest" />

jest.mock('../../src/infrastructure/persistence/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import type { Job } from 'bullmq';

import {
  DocumentPreviewWorker,
  type DocumentPreviewJobData,
} from '../../src/infrastructure/workers/document-preview.worker';
import type { PreviewProcessorContext } from '../../src/domain/services/preview-processor.context';
import type { S3Service } from '../../src/infrastructure/persistence/aws/s3.service';
import type { PrismaService } from '../../src/infrastructure/persistence/prisma/prisma.service';

describe('DocumentPreviewWorker', () => {
  beforeAll(() => {
    process.env.LOG_LEVEL ??= 'debug';
    process.env.SERVICE_NAME ??= 'upload-service';
  });

  it('uploads generated previews with the generated preview MIME type', async () => {
    const prisma = {
      client: {
        mediaFile: {
          findUnique: jest.fn(async () => ({
            s3Key: 'resources/file.docx',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            previewS3Key: null,
            previewStatus: 'PENDING',
            deletedAt: null,
          })),
          update: jest.fn(),
        },
      },
    } as unknown as PrismaService;
    const s3Service = {
      getPreviewKey: jest.fn(() => 'previews/30pct/resources/file.docx'),
      headObject: jest.fn(async () => false),
      getObjectBuffer: jest.fn(async () => Buffer.from('source')),
      uploadBuffer: jest.fn(async () => undefined),
    } as unknown as S3Service;
    const previewProcessor = {
      generatePreview: jest.fn(async () => Buffer.from('preview text')),
      getPreviewMimeType: jest.fn(() => 'text/plain; charset=utf-8'),
    } as unknown as PreviewProcessorContext;
    const worker = new DocumentPreviewWorker(prisma, s3Service, previewProcessor);

    await worker.process({ data: { fileId: 'file-1' } } as Job<DocumentPreviewJobData>);

    expect(s3Service.uploadBuffer).toHaveBeenCalledWith(
      'previews/30pct/resources/file.docx',
      Buffer.from('preview text'),
      'text/plain; charset=utf-8',
    );
    expect(prisma.client.mediaFile.update).toHaveBeenCalledWith({
      where: { id: 'file-1' },
      data: {
        previewS3Key: 'previews/30pct/resources/file.docx',
        previewStatus: 'AVAILABLE',
      },
    });
  });
});
