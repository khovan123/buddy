import { getRedisConfig, SearchResultLimitPolicy, SubscriptionRequiredPolicy } from '@libs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthProxyController } from './presentation/http/controllers/auth-proxy.controller';
import {
  BillingProxyController,
  BillingWebhookProxyController,
} from './presentation/http/controllers/billing-proxy.controller';
import { CareerSkillProxyController } from './presentation/http/controllers/career-skill-proxy.controller';
import { CollectionProxyController } from './presentation/http/controllers/collection-proxy.controller';
import { ContentMetaProxyController } from './presentation/http/controllers/content-meta-proxy.controller';
import { ForumProxyController } from './presentation/http/controllers/forum-proxy.controller';
import { GatewayHealthController } from './presentation/http/controllers/gateway-health.controller';
import { InteractionProxyController } from './presentation/http/controllers/interaction-proxy.controller';
import { LibraryProxyController } from './presentation/http/controllers/library-proxy.controller';
import { NotificationProxyController } from './presentation/http/controllers/notification-proxy.controller';
import { RagProxyController } from './presentation/http/controllers/rag-proxy.controller';
import { RecommendationProxyController } from './presentation/http/controllers/recommendation-proxy.controller';
import { ResourceProxyController } from './presentation/http/controllers/resource-proxy.controller';
import { TutorialProxyController } from './presentation/http/controllers/tutorial-proxy.controller';
import { UploadProxyController } from './presentation/http/controllers/upload-proxy.controller';
import { UserProxyController } from './presentation/http/controllers/user-proxy.controller';

import { HttpModule } from '@nestjs/axios';
import { ServiceRegistryService } from './infrastructure/config/service-registry.service';
import { ApiComposerService } from './infrastructure/http/api-composer.service';
import { HttpProxyService } from './infrastructure/http/http-proxy.service';

/** NestJS Module for  app. */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env',
    }),

    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
      }),
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),

    CacheModule.registerAsync({ isGlobal: true, useFactory: async () => await getRedisConfig() }),
    HttpModule,
    TerminusModule,
  ],
  controllers: [
    AuthProxyController,
    UserProxyController,
    GatewayHealthController,
    ContentMetaProxyController,
    ResourceProxyController,
    LibraryProxyController,
    TutorialProxyController,
    UploadProxyController,
    BillingProxyController,
    BillingWebhookProxyController,
    CollectionProxyController,
    CareerSkillProxyController,
    ForumProxyController,
    InteractionProxyController,
    RecommendationProxyController,
    RagProxyController,
    NotificationProxyController,
  ],
  providers: [
    HttpProxyService,
    ServiceRegistryService,
    ApiComposerService,
    SubscriptionRequiredPolicy,
    SearchResultLimitPolicy,
  ],
})
export class AppModule {}
