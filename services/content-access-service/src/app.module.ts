import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { TerminusModule } from '@nestjs/terminus';

import {
  HealthController,
  MessagingModule,
  PRISMA_CLIENT,
  PrismaHealthIndicator,
  getRedisConfig,
} from '@libs/common';

import { COMMAND_HANDLERS } from './application/commands/command.module';
import { QUERY_HANDLERS } from './application/queries/query.module';
import { CONTENT_ACCESS_REPOSITORY } from './domain/repositories/tokens';
import { MESSAGE_COMPONENTS, MESSAGE_CONTROLLERS } from './infrastructure/messaging/message.module';
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';
import { PrismaService } from './infrastructure/persistence/prisma/prisma.service';
import { ContentAccessPrismaRepository } from './infrastructure/persistence/prisma/repositories/content-access.prisma-repository';
import { AccessController } from './presentation/http/controllers/access.controller';

/** NestJS Module for  app. */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env',
    }),
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
      }),
    }),
    CacheModule.registerAsync({ isGlobal: true, useFactory: async () => await getRedisConfig() }),
    CqrsModule,
    TerminusModule,
    MessagingModule,
  ],
  controllers: [AccessController, ...MESSAGE_CONTROLLERS, HealthController],
  providers: [
    ...COMMAND_HANDLERS,
    ...QUERY_HANDLERS,
    ...MESSAGE_COMPONENTS,
    PrismaHealthIndicator,
    { provide: CONTENT_ACCESS_REPOSITORY, useClass: ContentAccessPrismaRepository },
    {
      provide: PRISMA_CLIENT,
      useFactory: (ps: PrismaService) => ps.client,
      inject: [PrismaService],
    },
  ],
})
export class AppModule {}
