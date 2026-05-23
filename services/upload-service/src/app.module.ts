import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';

import {
  getRedisConfig,
  HealthController,
  MessagingModule,
  PRISMA_CLIENT,
  PrismaHealthIndicator,
  QUEUES,
  SubscriptionRequiredPolicy,
} from '@libs/common';

import { UPLOAD_ROUTINGKEYS } from '@libs/contracts';
import { COMMAND_HANDLERS } from './application/commands/command.module';
import { OutboxCleanupService } from './application/cronjobs/outbox-cleanup.cron';
import { QUERY_HANDLERS } from './application/queries/query.module';
import { FILE_METADATA_REPOSITORY, STORAGE_PROVIDER } from './domain/repositories/tokens';
import { PreviewProcessorContext } from './domain/services/preview-processor.context';
import { MESSAGE_COMPONENTS, MESSAGE_CONTROLLERS } from './infrastructure/messaging/message.module';
import { S3Module } from './infrastructure/persistence/aws/s3.module';
import { S3Service } from './infrastructure/persistence/aws/s3.service';
import { CloudinaryService } from './infrastructure/persistence/cloudinary/cloudinary.service';
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';
import { PrismaService } from './infrastructure/persistence/prisma/prisma.service';
import { FileMetadataPrismaRepository } from './infrastructure/persistence/prisma/repositories/file-metadata.prisma-repository';
import { DocumentPreviewWorker } from './infrastructure/workers/document-preview.worker';
import { VideoProcessorWorker } from './infrastructure/workers/video-processor.worker';
import { UploadController } from './presentation/http/controllers/upload.controller';
import { WebhookController } from './presentation/webhooks/controllers/upload.webhook.controller';

/** NestJS Module for  app. */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env',
    }),
    PrismaModule,
    S3Module,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
      }),
    }),
    CacheModule.registerAsync({ isGlobal: true, useFactory: async () => await getRedisConfig() }),
    CqrsModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    TerminusModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: parseInt(config.get<string>('REDIS_PORT', '6379'), 10),
          password: config.get<string>('REDIS_PASSWORD'),
        },
      }),
    }),
    BullModule.registerQueue({
      name: QUEUES.VIDEO_PROCESSING_QUEUE,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5_000,
        },
      },
    }),
    BullModule.registerQueue({
      name: QUEUES.DOCUMENT_PREVIEW_QUEUE,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 200,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 3_000,
        },
      },
    }),
    MessagingModule,
  ],
  controllers: [UploadController, WebhookController, ...MESSAGE_CONTROLLERS, HealthController],
  providers: [
    ...COMMAND_HANDLERS,
    ...QUERY_HANDLERS,
    ...MESSAGE_COMPONENTS,
    PrismaHealthIndicator,
    {
      provide: PRISMA_CLIENT,
      useFactory: (ps: PrismaService) => ps.client,
      inject: [PrismaService],
    },
    { provide: FILE_METADATA_REPOSITORY, useClass: FileMetadataPrismaRepository },
    { provide: STORAGE_PROVIDER, useExisting: S3Service },
    S3Service,
    CloudinaryService,
    OutboxCleanupService,
    VideoProcessorWorker,
    DocumentPreviewWorker,
    PreviewProcessorContext,
    SubscriptionRequiredPolicy,
    {
      provide: UPLOAD_ROUTINGKEYS.VIDEO_PROCESSING_JOB,
      useValue: UPLOAD_ROUTINGKEYS.VIDEO_PROCESSING_JOB,
    },
  ],
})
export class AppModule {}
