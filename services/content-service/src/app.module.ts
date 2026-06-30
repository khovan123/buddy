import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';

import {
  CreatorOnlyPolicy,
  PBAC_LIMITS_RESOLVER,
  getRedisConfig,
  HealthController,
  MessagingModule,
  PrismaHealthIndicator,
  SubscriptionRequiredPolicy,
} from '@libs/common';
import {
  COLLECTION_REPOSITORY,
  CONTENT_VALIDATION_SERVICE,
  COURSE_REPOSITORY,
  MAJOR_REPOSITORY,
  RESOURCE_REPOSITORY,
  TUTORIAL_REPOSITORY,
} from './domain/repositories/tokens';
import { MongoModule } from './infrastructure/persistence/mongo/mongo.module';
import { CollectionMongoRepository } from './infrastructure/persistence/mongo/repositories/collection.mongo.repository';
import { CourseMongoRepository } from './infrastructure/persistence/mongo/repositories/course.mongo.repository';
import { MajorMongoRepository } from './infrastructure/persistence/mongo/repositories/major.mongo.repository';
import { ResourceMongoRepository } from './infrastructure/persistence/mongo/repositories/resource.mongo.repository';
import { TutorialMongoRepository } from './infrastructure/persistence/mongo/repositories/tutorial.mongo.repository';
import { ContentValidationServiceImpl } from './infrastructure/services/content-validation.service.impl';

import { COMMAND_HANDLERS } from './application/commands/command.module';
import { QUERY_HANDLERS } from './application/queries/query.module';
import { MESSAGE_COMPONENTS, MESSAGE_CONTROLLERS } from './infrastructure/messaging/message.module';
import { CollectionController } from './presentation/http/controllers/collection.controller';
import { ContentMetaController } from './presentation/http/controllers/content-meta.controller';
import { ContentSettingsController } from './presentation/http/controllers/content-settings.controller';
import { LibraryController } from './presentation/http/controllers/library.controller';
import { ResourceController } from './presentation/http/controllers/resource.controller';
import { TutorialController } from './presentation/http/controllers/tutorial.controller';

import { CleanupPendingCron } from './application/cronjobs/cleanup-pending.cron';
import {
  CollectionLimitPolicy,
  ResourceLimitPolicy,
  TutorialLimitPolicy,
} from './domain/policies/content-limit.policies';
import { ContentCountService } from './infrastructure/services/content-count.service';
import { ContentModerationService } from './infrastructure/services/content-moderation.service';
import { BillingPlanLimitsResolver } from './infrastructure/services/billing-plan-limits.resolver';
import { ContentSettingsService } from './infrastructure/services/content-settings.service';

/** NestJS Module for  app. */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env',
    }),
    MongoModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
      }),
    }),

    CacheModule.registerAsync({ isGlobal: true, useFactory: async () => await getRedisConfig() }),
    ScheduleModule.forRoot(),
    CqrsModule,
    TerminusModule,
    MessagingModule,
  ],
  controllers: [
    ResourceController,
    TutorialController,
    LibraryController,
    CollectionController,
    ContentMetaController,
    ContentSettingsController,
    ...MESSAGE_CONTROLLERS,
    HealthController,
  ],
  providers: [
    ...COMMAND_HANDLERS,
    ...QUERY_HANDLERS,
    ...MESSAGE_COMPONENTS,
    PrismaHealthIndicator,
    { provide: RESOURCE_REPOSITORY, useClass: ResourceMongoRepository },
    { provide: TUTORIAL_REPOSITORY, useClass: TutorialMongoRepository },
    { provide: COLLECTION_REPOSITORY, useClass: CollectionMongoRepository },
    { provide: MAJOR_REPOSITORY, useClass: MajorMongoRepository },
    { provide: COURSE_REPOSITORY, useClass: CourseMongoRepository },
    { provide: CONTENT_VALIDATION_SERVICE, useClass: ContentValidationServiceImpl },
    CleanupPendingCron,
    // PBAC policies
    ContentCountService,
    ContentSettingsService,
    ContentModerationService,
    SubscriptionRequiredPolicy,
    CreatorOnlyPolicy,
    BillingPlanLimitsResolver,
    { provide: PBAC_LIMITS_RESOLVER, useExisting: BillingPlanLimitsResolver },
    ResourceLimitPolicy,
    TutorialLimitPolicy,
    CollectionLimitPolicy,
  ],
})
export class AppModule {}
