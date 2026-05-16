import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { TerminusModule } from '@nestjs/terminus';

import {
  getRedisConfig,
  HealthController,
  MessagingModule,
  PRISMA_CLIENT,
  PrismaHealthIndicator,
} from '@libs/common';

import { COMMAND_HANDLERS } from './application/commands/command.module';
import { QUERY_HANDLERS } from './application/queries/query.module';

import {
  OTP_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
  TOKEN_SERVICE,
  USER_REPOSITORY,
} from './domain/repositories/tokens';
import { TokenService } from './infrastructure/services/token.service';
import { AuthController } from './presentation/http/controllers/auth.controller';

import { MESSAGE_COMPONENTS } from './infrastructure/messaging/message.module';
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';
import { PrismaService } from './infrastructure/persistence/prisma/prisma.service';
import { RefreshTokenPrismaRepository } from './infrastructure/persistence/prisma/repositories/refresh-token.prisma-repository';
import { UserPrismaRepository } from './infrastructure/persistence/prisma/repositories/user.prisma-repository';
import { OtpRedisRepository } from './infrastructure/persistence/redis/repositories/otp.redis-repository';

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
        signOptions: { expiresIn: config.get('JWT_ACCESS_EXPIRES_IN', '15m') },
      }),
    }),
    CacheModule.registerAsync({ isGlobal: true, useFactory: async () => await getRedisConfig() }),
    HttpModule,
    CqrsModule,
    TerminusModule,
    MessagingModule,
  ],
  controllers: [AuthController, HealthController],
  providers: [
    ...COMMAND_HANDLERS,
    ...QUERY_HANDLERS,
    { provide: TOKEN_SERVICE, useClass: TokenService },
    { provide: USER_REPOSITORY, useClass: UserPrismaRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenPrismaRepository },
    { provide: OTP_REPOSITORY, useClass: OtpRedisRepository },
    PrismaHealthIndicator,
    {
      provide: PRISMA_CLIENT,
      useFactory: (ps: PrismaService) => ps.client,
      inject: [PrismaService],
    },
    ...MESSAGE_COMPONENTS,
  ],
})
export class AppModule {}
