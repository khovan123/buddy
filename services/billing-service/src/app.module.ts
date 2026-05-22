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
  PRISMA_CLIENT,
  PrismaHealthIndicator,
  MessagingModule as SharedMessagingModule,
} from '@libs/common';

import { COMMAND_HANDLERS } from './application/commands/command.module';
import { QUERY_HANDLERS } from './application/queries/query.module';
import { PAYMENT_GATEWAYS, PAYOUT_GATEWAY, WALLET_REPOSITORY } from './domain/repositories/tokens';
import { PaymentGatewayFactory } from './infrastructure/external/payment/payment.factory';
import { SePayAdapter } from './infrastructure/external/payment/sepay.adapter';
import { MESSAGE_COMPONENTS } from './infrastructure/messaging/message.module';
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';
import { PrismaService } from './infrastructure/persistence/prisma/prisma.service';
import { WalletPrismaRepository } from './infrastructure/persistence/prisma/repositories/wallet.prisma.repository';
import { BillingController } from './presentation/http/controllers/billing.controller';
import { WebhookController } from './presentation/http/controllers/webhook.controller';

/** NestJS Module for  app. */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env',
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
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
    SharedMessagingModule,
  ],
  controllers: [BillingController, WebhookController, HealthController],
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
    { provide: WALLET_REPOSITORY, useClass: WalletPrismaRepository },
    { provide: PAYOUT_GATEWAY, useExisting: SePayAdapter },
    SePayAdapter,
    PaymentGatewayFactory,
    {
      provide: PAYMENT_GATEWAYS,
      inject: [SePayAdapter],
      useFactory: (sepay: SePayAdapter) => [sepay],
    },
  ],
})
export class AppModule {}
