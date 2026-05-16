import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';

import { EmailService } from './infrastructure/external/email/email.service';
import { NotificationMongoRepository } from './infrastructure/persistence/mongoose/repositories/notification.mongo-repository';
import { NotificationSchema } from './infrastructure/persistence/mongoose/schemas/notification.schema';

import { COMMAND_HANDLERS } from './application/commands/command.module';
import { QUERY_HANDLERS } from './application/queries/query.module';

import { HealthController, MessagingModule } from '@libs/common';
import { MESSAGE_COMPONENTS, MESSAGE_CONTROLLERS } from './infrastructure/messaging/message.module';
import { NOTIFICATION_REPOSITORY } from './domain/repositories/tokens';

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

    MongooseModule.forFeature([{ name: 'Notification', schema: NotificationSchema }]),
    HttpModule,
    CqrsModule,
    TerminusModule,
    MessagingModule,
  ],
  controllers: [...MESSAGE_CONTROLLERS, HealthController],
  providers: [
    ...COMMAND_HANDLERS,
    ...QUERY_HANDLERS,
    ...MESSAGE_COMPONENTS,
    { provide: NOTIFICATION_REPOSITORY, useClass: NotificationMongoRepository },
    EmailService,
  ],
})
export class AppModule {}
