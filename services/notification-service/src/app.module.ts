import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';

import { EmailService } from './infrastructure/external/email/email.service';
import { NotificationMongoRepository } from './infrastructure/persistence/mongoose/repositories/notification.mongo-repository';
import {
  NotificationPreference,
  NotificationPreferenceSchema,
} from './infrastructure/persistence/mongoose/schemas/notification-preference.schema';
import { NotificationSchema } from './infrastructure/persistence/mongoose/schemas/notification.schema';

import { COMMAND_HANDLERS } from './application/commands/command.module';
import { QUERY_HANDLERS } from './application/queries/query.module';

import { HealthController, MessagingModule } from '@libs/common';
import { MESSAGE_COMPONENTS, MESSAGE_CONTROLLERS } from './infrastructure/messaging/message.module';
import { NOTIFICATION_REPOSITORY } from './domain/repositories/tokens';
import { NotificationPreferencesController } from './presentation/http/controllers/notification-preferences.controller';

/** NestJS Module for  app. */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env',
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
        dbName: 'notification_db',
      }),
    }),

    MongooseModule.forFeature([
      { name: 'Notification', schema: NotificationSchema },
      { name: NotificationPreference.name, schema: NotificationPreferenceSchema },
    ]),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
      }),
    }),
    HttpModule,
    CqrsModule,
    TerminusModule,
    MessagingModule,
  ],
  controllers: [...MESSAGE_CONTROLLERS, HealthController, NotificationPreferencesController],
  providers: [
    ...COMMAND_HANDLERS,
    ...QUERY_HANDLERS,
    ...MESSAGE_COMPONENTS,
    { provide: NOTIFICATION_REPOSITORY, useClass: NotificationMongoRepository },
    EmailService,
  ],
})
export class AppModule {}
