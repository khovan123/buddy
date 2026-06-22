/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="jest" />
import '@libs/testing';

jest.mock(
  '../../../../upload-service/src/infrastructure/persistence/prisma/prisma.service',
  () => ({
    PrismaService: class PrismaService {},
  }),
);

import request from 'supertest';

import { JwtAuthGuard, PoliciesGuard, QUEUES, SubscriptionRequiredPolicy } from '@libs/common';
import { UPLOAD_ROUTINGKEYS } from '@libs/contracts';
import { CanActivate, ExecutionContext, VersioningType } from '@nestjs/common';
import { CommandBus, CqrsModule, QueryBus } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';

import { ConfirmResourceUploadHandler } from '../../../../upload-service/src/application/commands/handlers/confirm-resource-upload.handler';
import { CreateResourceHanlder } from '../../../src/application/commands/handlers/create-resource.handler';
import { ResourceMeta } from '../../../src/domain/entities/resource.entity';
import {
  COLLECTION_REPOSITORY,
  CONTENT_VALIDATION_SERVICE,
  RESOURCE_REPOSITORY,
} from '../../../src/domain/repositories/tokens';
import { RecommendationSyncPublisher } from '../../../src/infrastructure/messaging/publishers/recommendation-sync.publisher';
import { StorageBrokerPublisher } from '../../../src/infrastructure/messaging/publishers/storage-broker.rpc';
import { ResourceStatus } from '../../../src/infrastructure/persistence/mongo/schemas/resource.schema';
import { ResourceController } from '../../../src/presentation/http/controllers/resource.controller';

import { FILE_METADATA_REPOSITORY } from '../../../../upload-service/src/domain/repositories/tokens';
import { OutboxService } from '../../../../upload-service/src/infrastructure/messaging/publishers/outbox.service';
import { UploadEventPublisher } from '../../../../upload-service/src/infrastructure/messaging/publishers/upload-event.publisher';
import { S3Service } from '../../../../upload-service/src/infrastructure/persistence/aws/s3.service';
import { PrismaService } from '../../../../upload-service/src/infrastructure/persistence/prisma/prisma.service';
import { UploadController } from '../../../../upload-service/src/presentation/http/controllers/upload.controller';

type ResourceDoc = {
  id: string;
  userId: string;
  title: string;
  summary: string;
  price: number;
  status: ResourceStatus;
  meta: ResourceMeta[];
};

type UploadFileRecord = {
  id: string;
  s3Key: string;
  originalFilename: string;
  uploadedBy: string;
  fileSizeBytes: number;
  status: 'PENDING' | 'UPLOADED' | 'AVAILABLE';
};

type OutboxRow = {
  correlationId: string;
  type: string;
  payload: {
    resourceId: string;
    uploadedBy: string;
    meta: Array<{
      fileId: string;
      downloadUrl: string;
      size: number;
      extension: string;
    }>;
    completedAt: string;
  };
  exchange: string;
  routingKey: string;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
};

type CreateResourceApiResponse = {
  success: boolean;
  data: {
    resourceId: string;
    status: ResourceStatus;
    uploadUrls: Array<{
      fileId: string;
      s3Key: string;
      uploadUrl: string;
      estimatedTime: number;
      fileName: string;
      fileSizeBytes: number;
      mimeType?: string;
    }>;
  };
  correlationId?: string;
};

jest.setTimeout(30_000);

describe('Resource Multi-files Upload Integration', () => {
  let contentApp: NestFastifyApplication;
  let uploadApp: NestFastifyApplication;

  const resourceStore = new Map<string, ResourceDoc>();
  const uploadFilesStore = new Map<string, UploadFileRecord>();
  const outboxRows: OutboxRow[] = [];

  let uploadSequence = 0;

  const mockCollectionRepository = {
    findByIdWithType: jest.fn().mockResolvedValue(null),
  };

  const mockResourceRepository = {
    save: jest.fn(async (resource: any) => {
      resourceStore.set(resource.id, {
        id: resource.id,
        userId: resource.userId,
        title: resource.title,
        summary: resource.summary,
        price: resource.price,
        status: resource.status,
        meta: resource.meta,
      });
    }),
    update: jest.fn(async (resource: any) => {
      const current = resourceStore.get(resource.id);
      if (!current) return;
      resourceStore.set(resource.id, {
        ...current,
        status: resource.status,
        meta: resource.meta,
      });
    }),
    delete: jest.fn(async (resourceId: string) => {
      resourceStore.delete(resourceId);
    }),
    findBySlug: jest.fn(async () => null),
    completeUpload: jest.fn(async (resourceId: string, meta: ResourceMeta[]) => {
      const current = resourceStore.get(resourceId);
      if (!current) return;
      resourceStore.set(resourceId, {
        ...current,
        status: ResourceStatus.AVAILABLE,
        meta,
      });
    }),

    saveMeta: jest.fn(),
    deleteAllByUserId: jest.fn(),
    deleteAllMetaByResourceId: jest.fn(),
    findById: jest.fn(async (id: string) => resourceStore.get(id) ?? null),
    findMetaById: jest.fn(),
    findMetaByResourceId: jest.fn(),
    findByIdWithDetails: jest.fn(),
    findAvailableResources: jest.fn(),
    findAvailableResourceCollections: jest.fn(),
    updateMeta: jest.fn(),
    updateByFileId: jest.fn(),
    markFailedByFileId: jest.fn(),
    deletePendingOlderThan: jest.fn(),
    deleteMeta: jest.fn(),
  };

  const mockStorageBrokerPublisher = {
    getPresignedUrls: jest.fn(async (event: any) => {
      const uploadUrls = event.payload.files.map((file: any) => {
        uploadSequence += 1;
        const fileId = `file-${uploadSequence}`;
        const s3Key = `docs/${event.payload.resourceId}/${fileId}-${file.fileName}`;

        uploadFilesStore.set(fileId, {
          id: fileId,
          s3Key,
          originalFilename: file.fileName,
          uploadedBy: event.payload.uploadedBy,
          fileSizeBytes: file.fileSizeBytes,
          status: 'UPLOADED',
        });

        return {
          fileId,
          s3Key,
          uploadUrl: `https://mock-s3.local/upload/${fileId}`,
          estimatedTime: Math.max(1, Math.ceil(file.fileSizeBytes / (2 * 1024 * 1024))),
          fileName: file.fileName,
          fileSizeBytes: file.fileSizeBytes,
          mimeType: file.mimeType,
        };
      });

      return {
        resourceId: event.payload.resourceId,
        uploadUrls,
      };
    }),
  };

  const mockUploadFileRepository = {
    findById: jest.fn(async (id: string) => {
      const row = uploadFilesStore.get(id);
      if (!row) return null;

      return {
        id: row.id,
        s3Key: row.s3Key,
        originalFilename: row.originalFilename,
        uploadedBy: row.uploadedBy,
        fileSizeBytes: row.fileSizeBytes,
        mimeType: 'text/plain',
        status: row.status,
      };
    }),
    markCompleted: jest.fn(),
    markProcessingIfPending: jest.fn(),
    markProcessing: jest.fn(),
    markFailed: jest.fn(),
    updateStatus: jest.fn(),
    createPending: jest.fn(),
  };

  const mockS3Service = {
    generatePresignedDownloadUrl: jest.fn(
      async (s3Key: string) => `https://mock-s3.local/download/${s3Key}`,
    ),
  };

  const mockUploadPublisher = {
    publish: jest.fn(),
    publishFileProcessed: jest.fn(),
  };

  const mockUploadCommandBus = {
    execute: jest.fn(async (command: any) => {
      if (command.constructor.name === 'ConfirmResourceUploadCommand') {
        const handler = new ConfirmResourceUploadHandler(
          mockUploadFileRepository as any,
          new OutboxService(new EventEmitter2(), mockPrismaService as any),
          mockS3Service as any,
          { client: mockPrismaService } as any,
          { isSupported: jest.fn().mockReturnValue(false) } as any,
          { add: jest.fn().mockResolvedValue(undefined) } as any,
          { add: jest.fn().mockResolvedValue(undefined) } as any,
        );
        return handler.execute(command);
      }
    }),
  } as unknown as CommandBus;

  const mockPrismaService = {
    $transaction: jest.fn(async (callback: (tx: any) => Promise<void>) => {
      const tx = {
        mediaFile: {
          update: jest.fn(async ({ where, data }: any) => {
            const existing = uploadFilesStore.get(where.id);
            if (!existing) {
              throw new Error(`mediaFile not found: ${where.id}`);
            }
            uploadFilesStore.set(where.id, {
              ...existing,
              status: data.status ?? existing.status,
            });
            return { ...existing, ...data };
          }),
        },
        outbox: {
          create: jest.fn(async ({ data }: any) => {
            outboxRows.push({
              correlationId: data.correlationId,
              type: data.type,
              payload: data.payload,
              exchange: data.exchange,
              routingKey: data.routingKey,
              status: data.status,
            });
          }),
        },
      };

      await callback(tx);
    }),
  } as unknown as PrismaService;

  class AlwaysAuthGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean {
      const req = ctx.switchToHttp().getRequest();
      req.user = { sub: 'user-qa' };
      return true;
    }
  }

  beforeAll(async () => {
    const mockContentValidationService = {
      validateMajorExists: jest.fn().mockResolvedValue(true),
      validateCourseExists: jest.fn().mockResolvedValue(true),
    };

    const contentModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [ResourceController],
      providers: [
        CreateResourceHanlder,
        { provide: RESOURCE_REPOSITORY, useValue: mockResourceRepository },
        { provide: COLLECTION_REPOSITORY, useValue: mockCollectionRepository },
        { provide: CONTENT_VALIDATION_SERVICE, useValue: mockContentValidationService },
        { provide: StorageBrokerPublisher, useValue: mockStorageBrokerPublisher },
        { provide: RecommendationSyncPublisher, useValue: { send: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AlwaysAuthGuard)
      .overrideGuard(PoliciesGuard)
      .useClass(AlwaysAuthGuard)
      .compile();

    contentApp = contentModule.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    contentApp.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await contentApp.init();
    await contentApp.getHttpAdapter().getInstance().ready();

    const uploadModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        { provide: CommandBus, useValue: mockUploadCommandBus },
        { provide: QueryBus, useValue: { execute: jest.fn() } },
        { provide: FILE_METADATA_REPOSITORY, useValue: mockUploadFileRepository },
        {
          provide: SubscriptionRequiredPolicy,
          useValue: { handle: jest.fn().mockReturnValue(true) },
        },
        { provide: UploadEventPublisher, useValue: mockUploadPublisher },
        { provide: S3Service, useValue: mockS3Service },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        OutboxService,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AlwaysAuthGuard)
      .compile();

    uploadApp = uploadModule.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    uploadApp.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await uploadApp.init();
    await uploadApp.getHttpAdapter().getInstance().ready();
  });

  afterEach(() => {
    resourceStore.clear();
    uploadFilesStore.clear();
    outboxRows.length = 0;
    uploadSequence = 0;
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (contentApp) {
      await contentApp.close();
    }
    if (uploadApp) {
      await uploadApp.close();
    }
  });

  it('Happy Path: create pending resource, confirm all files, create outbox row, then apply consumer to AVAILABLE', async () => {
    const createPayload = {
      title: 'Integration Resource Bundle',
      summary: 'Summary for integration test with multiple files and outbox validation.',
      price: '49000',
      files: [
        { fileName: 'a.txt', fileSizeBytes: 1024 * 1024 },
        { fileName: 'b.docx', fileSizeBytes: 2 * 1024 * 1024 },
        { fileName: 'c.md', fileSizeBytes: 3 * 1024 * 1024 },
      ],
    };

    const createRes = await request(contentApp.getHttpServer())
      .post('/v1/resources')
      .set('x-correlation-id', 'corr-resource-happy-001')
      .send(createPayload)
      .expect((res) => {
        if (res.status !== 201) {
          console.error('Resource Creation Failed:', res.body);
        }
      })
      .expect(201);

    const createBody = createRes.body as CreateResourceApiResponse;
    expect(createBody.success).toBe(true);
    expect(createBody.data.status).toBe(ResourceStatus.PENDING);
    expect(createBody.data.uploadUrls).toHaveLength(createPayload.files.length);

    const resourceId = createBody.data.resourceId;
    const resourceInMongo = resourceStore.get(resourceId);
    expect(resourceInMongo).toBeDefined();
    expect(resourceInMongo?.status).toBe(ResourceStatus.PENDING);

    const fileIds = createBody.data.uploadUrls.map((u) => u.fileId);

    await request(uploadApp.getHttpServer())
      .post('/v1/uploads/resource/confirm')
      .set('x-correlation-id', resourceId)
      .send({
        resourceId,
        fileIds,
      })
      .expect(201);

    const outboxEvent = outboxRows.find(
      (row) => row.routingKey === UPLOAD_ROUTINGKEYS.RESOURCE_UPLOAD_COMPLETED,
    );
    expect(outboxEvent).toBeDefined();
    expect(outboxEvent?.correlationId).toBe(resourceId);
    expect(outboxEvent?.payload.resourceId).toBe(resourceId);
    expect(outboxEvent?.payload.meta).toHaveLength(fileIds.length);

    // Giả lập consumer sau khi Outbox Relay publish event thành công.
    await mockResourceRepository.completeUpload(
      outboxEvent!.payload.resourceId,
      outboxEvent!.payload.meta.map((m) => ({
        fileId: m.fileId,
        downloadUrl: m.downloadUrl,
        fileSize: m.size,
        extension: m.extension,
      })),
    );

    const availableResource = resourceStore.get(resourceId);
    expect(availableResource?.status).toBe(ResourceStatus.AVAILABLE);
    expect(availableResource?.meta).toHaveLength(fileIds.length);
    expect(availableResource?.meta.every((m) => Boolean(m.downloadUrl))).toBe(true);
  });

  it('Negative Path: missing files must fail confirm, no new outbox row, resource remains PENDING', async () => {
    const createPayload = {
      title: 'Missing Files Case',
      summary: 'Negative test for missing uploaded files in confirm endpoint validation.',
      price: '39000',
      files: [
        { fileName: 'x.txt', fileSizeBytes: 1024 * 1024 },
        { fileName: 'y.docx', fileSizeBytes: 1024 * 1024 },
        { fileName: 'z.md', fileSizeBytes: 1024 * 1024 },
      ],
    };

    const createRes = await request(contentApp.getHttpServer())
      .post('/v1/resources')
      .set('x-correlation-id', 'corr-resource-negative-001')
      .send(createPayload)
      .expect(201);

    const createBody = createRes.body as CreateResourceApiResponse;
    const resourceId = createBody.data.resourceId;
    const fileIds = createBody.data.uploadUrls.map((u) => u.fileId);

    // Giả lập chỉ 1 file đã được upload/ready, 2 file còn lại bị thiếu metadata.
    const keepFileId = fileIds[0];
    const keepFile = uploadFilesStore.get(keepFileId);
    uploadFilesStore.clear();
    if (keepFile) {
      uploadFilesStore.set(keepFileId, keepFile);
    }

    const beforeOutboxCount = outboxRows.length;

    const confirmRes = await request(uploadApp.getHttpServer())
      .post('/v1/uploads/resource/confirm')
      .set('x-correlation-id', resourceId)
      .send({
        resourceId,
        fileIds,
      });

    expect([400, 404]).toContain(confirmRes.status);
    expect(outboxRows.length).toBe(beforeOutboxCount);

    const pendingResource = resourceStore.get(resourceId);
    expect(pendingResource?.status).toBe(ResourceStatus.PENDING);
  });

  it('should keep queue constants traceable in test scope', () => {
    expect(QUEUES.CONTENT_RESOURCE_EVENTS).toBe('content.resource.events');
  });
});
