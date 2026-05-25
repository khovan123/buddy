/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="jest" />
import '@libs/testing';

jest.mock(
  '../../../../upload-service/src/infrastructure/persistence/prisma/prisma.service',
  () => ({
    PrismaService: class PrismaService {},
  }),
);

import {
  CreatorOnlyPolicy,
  JwtAuthGuard,
  PoliciesGuard,
  SubscriptionRequiredPolicy,
} from '@libs/common';
import { FileProcessedEvent, FileProcessingFailedEvent, UPLOAD_ROUTINGKEYS } from '@libs/contracts';
import { getQueueToken } from '@nestjs/bullmq';
import { CanActivate, ExecutionContext, VersioningType } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ClientProxy, RmqContext } from '@nestjs/microservices';
import { getModelToken } from '@nestjs/mongoose';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';

import { CqrsModule } from '@nestjs/cqrs';
import { COMMAND_HANDLERS } from '../../../src/application/commands/command.module';
import {
  CollectionLimitPolicy,
  ResourceLimitPolicy,
  TutorialLimitPolicy,
} from '../../../src/domain/policies/content-limit.policies';
import {
  COLLECTION_REPOSITORY,
  CONTENT_VALIDATION_SERVICE,
  COURSE_REPOSITORY,
  MAJOR_REPOSITORY,
  RESOURCE_REPOSITORY,
  TUTORIAL_REPOSITORY,
} from '../../../src/domain/repositories/tokens';
import { UploadProcessedConsumer } from '../../../src/infrastructure/messaging/consumers/upload-processed.consumer';
import {
  MESSAGE_COMPONENTS,
} from '../../../src/infrastructure/messaging/message.module';
import { RecommendationSyncPublisher } from '../../../src/infrastructure/messaging/publishers/recommendation-sync.publisher';
import { StorageBrokerPublisher } from '../../../src/infrastructure/messaging/publishers/storage-broker.rpc';
import { UserServicePublisher } from '../../../src/infrastructure/messaging/publishers/user-service.rpc';
import { MongoService } from '../../../src/infrastructure/persistence/mongo/mongo.service';
import {
  ProcessedMessage,
  ProcessedMessageStatus,
} from '../../../src/infrastructure/persistence/mongo/schemas/processed-message.schema';
import { ContentCountService } from '../../../src/infrastructure/services/content-count.service';
import { ContentModerationService } from '../../../src/infrastructure/services/content-moderation.service';
import { TutorialController } from '../../../src/presentation/http/controllers/tutorial.controller';

import { FILE_METADATA_REPOSITORY } from '../../../../upload-service/src/domain/repositories/tokens';
import { OutboxService } from '../../../../upload-service/src/infrastructure/messaging/publishers/outbox.service';
import { UploadEventPublisher } from '../../../../upload-service/src/infrastructure/messaging/publishers/upload-event.publisher';
import { S3Service } from '../../../../upload-service/src/infrastructure/persistence/aws/s3.service';
import { PrismaService } from '../../../../upload-service/src/infrastructure/persistence/prisma/prisma.service';
import { UploadController } from '../../../../upload-service/src/presentation/http/controllers/upload.controller';

jest.setTimeout(30_000);

process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

type TutorialRecord = {
  id: string;
  status: string;
  media: {
    fileId: string;
    videoUrl?: string;
    streamingUrl?: string | null;
    trailerUrl?: string | null;
    fileSize?: number;
    extension?: string;
  };
  processingError?: string | null;
};

type UploadMetadataRecord = {
  id: string;
  s3Key: string;
  mimeType: string;
  uploadedBy: string;
  fileSizeBytes: number;
  status: string;
};

type TutorialAggregateInput = {
  id: string;
  status: string;
  media: TutorialRecord['media'];
};

type TutorialMediaPatch = Partial<TutorialRecord['media']>;

type TutorialProcessedPatch = {
  streamingUrl?: string | null;
  trailerUrl?: string | null;
};

type CreateTutorialResponse = {
  success: boolean;
  data: {
    id: string;
    fileId: string;
    s3Key: string;
  };
};

describe('Video Workflow Integration - Content + Upload', () => {
  let contentApp: NestFastifyApplication;
  let uploadApp: NestFastifyApplication;
  let testingModule: TestingModule;

  let rabbitClient: ClientProxy;
  let uploadProcessedConsumer: UploadProcessedConsumer;

  const tutorialDb = new Map<string, TutorialRecord>();
  const uploadMetadataDb = new Map<string, UploadMetadataRecord>();
  const processedMessageDb = new Map<string, { status: ProcessedMessageStatus }>();

  const mockQueue = {
    add: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  };

  const mockProcessedMessageModel = {
    findOne: jest.fn((query: Record<string, string>) => ({
      lean: () => ({
        exec: async () => {
          const key = `${query.correlationId}:${query.routingKey}:${query.serviceName}`;
          const row = processedMessageDb.get(key);
          if (!row) {
            return null;
          }

          if (query.status && row.status !== query.status) {
            return null;
          }

          return { ...row };
        },
      }),
    })),
    updateOne: jest.fn(
      (query: Record<string, string>, update: any, options?: { upsert?: boolean }) => ({
        exec: async () => {
          const key = `${query.correlationId}:${query.routingKey}:${query.serviceName}`;
          const existing = processedMessageDb.get(key);
          let upsertedCount = 0;

          if (!existing && options?.upsert) {
            upsertedCount = 1;
            processedMessageDb.set(key, {
              status: update?.$setOnInsert?.status ?? ProcessedMessageStatus.PROCESSING,
            });
          }

          if (update?.$set?.status) {
            processedMessageDb.set(key, {
              status: update.$set.status,
            });
          }

          return { upsertedCount };
        },
      }),
    ),
  };

  const mockMongoService = {
    onModuleInit: jest.fn(async () => undefined),
    getConnection: jest.fn(() => ({
      startSession: async () => ({
        withTransaction: async (callback: () => Promise<void>) => callback(),
        endSession: async () => undefined,
      }),
    })),
  };

  const mockS3Service = {
    generatePresignedUploadUrl: jest.fn(async (fileName: string) => ({
      fileKey: `videos/mock-${Date.now()}-${fileName}`,
      uploadUrl: 'https://mock-s3.local/upload',
      bucket: 'resources',
      mimeType: 'video/mp4',
    })),
    generatePresignedDownloadUrl: jest.fn(async () => 'https://mock-s3.local/download/file'),
  };

  const mockCollectionRepository = {
    findByIdWithType: jest.fn().mockResolvedValue(null),
  };

  const mockTutorialRepository = {
    save: jest.fn(async (tutorial: TutorialAggregateInput) => {
      tutorialDb.set(tutorial.id, {
        id: tutorial.id,
        status: tutorial.status,
        media: {
          fileId: tutorial.media.fileId,
          videoUrl: tutorial.media.videoUrl,
          streamingUrl: tutorial.media.streamingUrl,
          trailerUrl: tutorial.media.trailerUrl,
          fileSize: tutorial.media.fileSize,
          extension: tutorial.media.extension,
        },
        processingError: null,
      });
    }),
    saveMedia: jest.fn(),
    deleteAllByUserId: jest.fn(),
    findById: jest.fn(async (id: string) => tutorialDb.get(id) ?? null),
    findBySlug: jest.fn().mockResolvedValue(null),
    findByResourceIds: jest.fn().mockResolvedValue([]),
    findByCollectionId: jest.fn().mockResolvedValue(null),
    findMediaById: jest.fn(),
    findMediaByTutorialId: jest.fn(),
    findByIdWithDetails: jest.fn(),
    findBySlugWithDetails: jest.fn(),
    findByMediaFileIdWithDetails: jest.fn(),
    findAvailableTutorials: jest.fn(),
    findAvailableTutorialCollections: jest.fn(),
    update: jest.fn(),
    updateMedia: jest.fn(async (tutorialId: string, media: TutorialMediaPatch) => {
      const current = tutorialDb.get(tutorialId);
      if (!current) return;
      current.media = {
        ...current.media,
        ...media,
      };
      tutorialDb.set(tutorialId, current);
    }),
    updateByFileId: jest.fn(async (fileId: string, params: TutorialProcessedPatch) => {
      const tutorial = [...tutorialDb.values()].find((x) => x.media.fileId === fileId);
      if (!tutorial) return;
      tutorial.status = 'available';
      tutorial.media.streamingUrl = params.streamingUrl ?? tutorial.media.streamingUrl ?? null;
      tutorial.media.trailerUrl = params.trailerUrl ?? tutorial.media.trailerUrl ?? null;
      tutorialDb.set(tutorial.id, tutorial);
    }),
    markFailedByFileId: jest.fn(async (fileId: string) => {
      const tutorial = [...tutorialDb.values()].find((x) => x.media.fileId === fileId);
      if (!tutorial) return;
      tutorial.status = 'failed';
      tutorial.processingError = 'Video processing failed';
      tutorialDb.set(tutorial.id, tutorial);
    }),
    markAvailableWithProcessedMedia: jest.fn(),
    applyModerationResult: jest.fn(),
    deletePendingOlderThan: jest.fn(),
    delete: jest.fn(async (id: string) => tutorialDb.delete(id)),
  };

  const mockResourceRepository = {
    save: jest.fn(),
    saveMeta: jest.fn(),
    deleteAllByUserId: jest.fn(),
    deleteAllMetaByResourceId: jest.fn(),
    findById: jest.fn(),
    findMetaById: jest.fn(),
    findMetaByResourceId: jest.fn(),
    findByIdWithDetails: jest.fn(),
    findAvailableResources: jest.fn(),
    findAvailableResourceCollections: jest.fn(),
    update: jest.fn(),
    updateMeta: jest.fn(),
    updateByFileId: jest.fn(),
    markFailedByFileId: jest.fn(),
    deletePendingOlderThan: jest.fn(),
    delete: jest.fn(),
    deleteMeta: jest.fn(),
  };

  let sequence = 0;
  const mockStorageBrokerPublisher = {
    getPresignedUrl: jest.fn(async () => {
      sequence += 1;
      const fileId = `file-${sequence}`;
      const s3Key = `videos/${fileId}.mp4`;
      uploadMetadataDb.set(fileId, {
        id: fileId,
        s3Key,
        mimeType: 'video/mp4',
        uploadedBy: 'user-qa',
        fileSizeBytes: 123_456,
        status: 'PENDING',
      });

      return {
        uploadUrl: {
          fileId,
          s3Key,
          uploadUrl: `https://mock-s3.local/upload/${fileId}`,
          estimatedTime: 30,
        },
      };
    }),
  };

  class AlwaysAuthGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean {
      const req = ctx.switchToHttp().getRequest();
      req.user = { sub: 'user-qa' };
      return true;
    }
  }

  const mockUploadFileRepository = {
    findById: jest.fn(async (id: string) => {
      const row = uploadMetadataDb.get(id);
      if (!row) return null;
      return {
        id: row.id,
        s3Key: row.s3Key,
        mimeType: row.mimeType,
        uploadedBy: row.uploadedBy,
        fileSizeBytes: row.fileSizeBytes,
        status: row.status,
      };
    }),
    markCompleted: jest.fn(async (id: string) => {
      const row = uploadMetadataDb.get(id);
      if (!row) return;
      row.status = 'AVAILABLE';
      uploadMetadataDb.set(id, row);
    }),
  };

  const mockUploadCommandBus = {
    execute: jest.fn(async () => ({
      status: 'PROCESSING',
      message: 'queued',
    })),
  };

  const mockUploadPublisher = {
    publishFileProcessed: jest.fn(),
  };

  const mockRabbitEmit: ClientProxy['emit'] = <TResult = unknown, TInput = unknown>(
    pattern: unknown,
    payload: TInput,
  ) => {
    const ctx = createMockRmqContext();

    if (pattern === UPLOAD_ROUTINGKEYS.FILE_PROCESSED) {
      void uploadProcessedConsumer.handleFileProcessed(payload as never, ctx.getMessage() as any);
    }

    if (pattern === UPLOAD_ROUTINGKEYS.FILE_PROCESSING_FAILED) {
      void uploadProcessedConsumer.handleFileProcessingFailed(
        payload as never,
        ctx.getMessage() as any,
      );
    }

    return of(true as unknown as TResult);
  };

  const mockRabbitClient: Pick<ClientProxy, 'emit'> = {
    emit: jest.fn(mockRabbitEmit) as ClientProxy['emit'],
  };

  beforeAll(async () => {
    // Khởi tạo testing module của content-service, override các provider quan trọng để test E2E an toàn.
    const builder = Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [TutorialController, UploadProcessedConsumer],
      providers: [
        ...COMMAND_HANDLERS,
        ...MESSAGE_COMPONENTS,
        ContentCountService,
        {
          provide: CONTENT_VALIDATION_SERVICE,
          useValue: {
            validateCourseExists: jest.fn().mockResolvedValue(true),
            validateMajorExists: jest.fn().mockResolvedValue(true),
          },
        },
        { provide: COURSE_REPOSITORY, useValue: {} },
        { provide: MAJOR_REPOSITORY, useValue: {} },
        { provide: QueryBus, useValue: { execute: jest.fn() } },
        { provide: 'RABBITMQ_CLIENT', useValue: mockRabbitClient },
        { provide: S3Service, useValue: mockS3Service },
        { provide: getQueueToken('VIDEO_PROCESSING_QUEUE'), useValue: mockQueue },
        { provide: TUTORIAL_REPOSITORY, useValue: mockTutorialRepository },
        { provide: RESOURCE_REPOSITORY, useValue: mockResourceRepository },
        { provide: COLLECTION_REPOSITORY, useValue: mockCollectionRepository },
        { provide: StorageBrokerPublisher, useValue: mockStorageBrokerPublisher },
        { provide: UserServicePublisher, useValue: { getUsersProfiles: jest.fn() } },
        {
          provide: ContentModerationService,
          useValue: {
            moderate: jest.fn().mockResolvedValue({
              decision: 'APPROVED',
              score: 0,
              reasons: ['integration test'],
              ruleVersion: 'test',
            }),
          },
        },
        {
          provide: RecommendationSyncPublisher,
          useValue: {
            send: jest.fn(),
            onModuleInit: jest.fn(async () => undefined),
            onModuleDestroy: jest.fn(async () => undefined),
          },
        },
        { provide: getModelToken(ProcessedMessage.name), useValue: mockProcessedMessageModel },
        { provide: MongoService, useValue: mockMongoService },
        { provide: CreatorOnlyPolicy, useValue: { handle: jest.fn().mockReturnValue(true) } },
        { provide: TutorialLimitPolicy, useValue: { handle: jest.fn().mockReturnValue(true) } },
        { provide: ResourceLimitPolicy, useValue: { handle: jest.fn().mockReturnValue(true) } },
        { provide: CollectionLimitPolicy, useValue: { handle: jest.fn().mockReturnValue(true) } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AlwaysAuthGuard)
      .overrideGuard(PoliciesGuard)
      .useClass(AlwaysAuthGuard);

    testingModule = await builder.compile();

    contentApp = testingModule.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    contentApp.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await contentApp.init();
    await contentApp.getHttpAdapter().getInstance().ready();

    uploadProcessedConsumer = testingModule.get(UploadProcessedConsumer);
    rabbitClient = testingModule.get<ClientProxy>('RABBITMQ_CLIENT');

    // Khởi tạo mini upload app để gọi endpoint confirm mà không chạy worker thật.
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
        { provide: OutboxService, useValue: { put: jest.fn() } },
        { provide: S3Service, useValue: mockS3Service },
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
              callback({ mediaFile: { update: jest.fn() }, outbox: { create: jest.fn() } }),
            ),
          },
        },
        { provide: getQueueToken('VIDEO_PROCESSING_QUEUE'), useValue: {} },
      ],
    })
      .overrideProvider(S3Service)
      .useValue(mockS3Service)
      .overrideProvider(getQueueToken('VIDEO_PROCESSING_QUEUE'))
      .useValue(mockQueue)
      .overrideGuard(JwtAuthGuard)
      .useClass(AlwaysAuthGuard)
      .compile();

    uploadApp = uploadModule.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    uploadApp.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await uploadApp.init();
    await uploadApp.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (contentApp) {
      await contentApp.close();
    }
    if (uploadApp) {
      await uploadApp.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    processedMessageDb.clear();
  });

  describe('Happy Path - Video Processing Success', () => {
    it('should create tutorial -> confirm upload -> consume FILE_PROCESSED and update tutorial media', async () => {
      // Step 1: Tạo tutorial từ content-service
      const createRes = await contentApp.inject({
        method: 'POST',
        url: '/v1/tutorials',
        payload: {
          title: 'NodeJS Video Course',
          description:
            'This is a long tutorial description for e2e testing purpose. It has enough length to satisfy validation.',
          price: 199000,
          discount: 10,
          discountBundle: 15,
          fileName: 'lesson-1.mp4',
          fileSizeBytes: 1_500_000,
          videoDurationSeconds: 120,
        },
      });
      const createBody = parseResponseBody<CreateTutorialResponse>(createRes.body);

      expect(createRes.statusCode).toBe(201);
      expect(createBody.success).toBe(true);

      const tutorialId = createBody.data.id as string;
      const fileId = createBody.data.fileId as string;
      const s3Key = createBody.data.s3Key as string;

      expect(tutorialId).toBeDefined();
      expect(fileId).toBeDefined();
      expect(s3Key).toBeDefined();

      // Step 2: Gọi confirm API ở upload-service
      const confirmRes = await uploadApp.inject({
        method: 'POST',
        url: '/v1/uploads/tutorial/confirm',
        payload: {
          fileId,
          s3Key,
        },
      });

      expect(confirmRes.statusCode).toBe(201);
      expect(mockUploadCommandBus.execute).toHaveBeenCalled();

      // Step 3: Giả lập upload-service xử lý xong bằng event FILE_PROCESSED
      const successEvent = new FileProcessedEvent({
        fileId,
        streamingUrl: `https://cdn.local/hls/${fileId}/index.m3u8`,
        trailerUrl: `https://cdn.local/trailer/${fileId}.mp4`,
        fileSize: 1_500_000,
        uploadedBy: 'user-qa',
        processedAt: new Date().toISOString(),
      });

      rabbitClient.emit(UPLOAD_ROUTINGKEYS.FILE_PROCESSED, successEvent.payload);

      // Step 4: Đợi consumer xử lý và verify DB
      await waitFor(500);
      const updated = await getTutorialFromDb(tutorialId, tutorialDb);

      expect(updated).toBeDefined();
      expect(['available', 'published']).toContain((updated?.status || '').toLowerCase());
      expect(updated?.media.streamingUrl).toBeTruthy();
    });
  });

  describe('Failure Path - Video Processing Failed', () => {
    it('should mark tutorial FAILED when FILE_PROCESSING_FAILED is emitted', async () => {
      // Step 1: Seed tutorial đang xử lý với fileId giả
      const seeded = await seedPendingTutorial(tutorialDb, {
        tutorialId: 'tutorial-failed-1',
        fileId: 'file-failed-1',
      });

      expect(seeded.status.toLowerCase()).toBe('processing');

      // Step 2: Emit event thất bại từ upload-service
      const failedEvent = new FileProcessingFailedEvent({
        fileId: seeded.media.fileId,
        reason: 'FFmpeg transcoding failed after max retry',
        uploadedBy: 'user-qa',
        failedAt: new Date().toISOString(),
      });

      rabbitClient.emit(UPLOAD_ROUTINGKEYS.FILE_PROCESSING_FAILED, failedEvent.payload);

      // Step 3: Đợi consumer xử lý và verify DB
      await waitFor(500);
      const updated = await getTutorialFromDb(seeded.id, tutorialDb);

      expect(updated).toBeDefined();
      expect(updated?.status.toLowerCase()).toBe('failed');
      expect(updated?.processingError).toBeTruthy();
    });
  });
});

function createMockRmqContext(): RmqContext {
  const channelRef = {
    ack: jest.fn(),
    nack: jest.fn(),
    sendToQueue: jest.fn(),
  };

  const message = {
    properties: {
      headers: {
        'x-correlation-id': `test-correlation-${Date.now()}`,
      },
    },
  };

  return {
    getChannelRef: () => channelRef,
    getMessage: () => message,
  } as unknown as RmqContext;
}

async function waitFor(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function getTutorialFromDb(
  tutorialId: string,
  db: Map<string, TutorialRecord>,
): Promise<TutorialRecord | null> {
  return db.get(tutorialId) ?? null;
}

function parseResponseBody<T>(body: string): T {
  return JSON.parse(body) as T;
}

async function seedPendingTutorial(
  db: Map<string, TutorialRecord>,
  input: { tutorialId: string; fileId: string },
): Promise<TutorialRecord> {
  const seeded: TutorialRecord = {
    id: input.tutorialId,
    status: 'processing',
    media: {
      fileId: input.fileId,
      videoUrl: '',
      streamingUrl: null,
      trailerUrl: null,
      fileSize: 0,
      extension: '.mp4',
    },
    processingError: null,
  };

  db.set(seeded.id, seeded);
  return seeded;
}
