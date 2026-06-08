import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController, MessagingModule } from '@libs/common';
import { INTERACTION_REPOSITORY } from './domain/repositories/tokens';
import { COMMAND_HANDLERS } from './application/commands/command.module';
import { ForumService } from './application/forum/forum.service';
import { ForumStreamService } from './application/forum/forum-stream.service';
import { QUERY_HANDLERS } from './application/queries/query.module';
import { InteractionStreamService } from './application/interactions/interaction-stream.service';
import { MESSAGE_COMPONENTS } from './infrastructure/messaging/message.module';
import { MongoModule } from './infrastructure/persistence/mongo/mongo.module';
import { InteractionMongoRepository } from './infrastructure/persistence/mongo/repositories/interaction.mongo.repository';
import { ForumController } from './presentation/http/controllers/forum.controller';
import { InteractionController } from './presentation/http/controllers/interaction.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env',
    }),
    CqrsModule,
    MongoModule,
    TerminusModule,
    MessagingModule,
  ],
  controllers: [InteractionController, ForumController, HealthController],
  providers: [
    // Domain → Infrastructure binding
    {
      provide: INTERACTION_REPOSITORY,
      useClass: InteractionMongoRepository,
    },
    ...COMMAND_HANDLERS,
    ...QUERY_HANDLERS,
    ...MESSAGE_COMPONENTS,
    InteractionStreamService,
    ForumStreamService,
    ForumService,
  ],
})
export class AppModule {}
