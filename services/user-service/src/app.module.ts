import { getRedisConfig, HealthController, MessagingModule } from '@libs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';

// ── Schemas ─────────────────────────────────────────────────────
import { CareerSchema } from './infrastructure/persistence/mongoose/schemas/career.schema';
import { FollowSchema } from './infrastructure/persistence/mongoose/schemas/follow.schema';
import { HighlightSkillSchema } from './infrastructure/persistence/mongoose/schemas/highlight-skill.schema';
import { UserRatingSchema } from './infrastructure/persistence/mongoose/schemas/user-rating.schema';
import { UserSchema } from './infrastructure/persistence/mongoose/schemas/user.schema';

// ── Repositories ────────────────────────────────────────────────
import { CareerMongoRepository } from './infrastructure/persistence/mongoose/repositories/career.mongo-repository';
import { FollowMongoRepository } from './infrastructure/persistence/mongoose/repositories/follow.mongo-repository';
import { HighlightSkillMongoRepository } from './infrastructure/persistence/mongoose/repositories/highlight-skill.mongo-repository';
import { UserRatingMongoRepository } from './infrastructure/persistence/mongoose/repositories/user-rating.mongo-repository';
import { UserMongoRepository } from './infrastructure/persistence/mongoose/repositories/user.mongo-repository';

// ── Tokens ──────────────────────────────────────────────────────
import {
  CAREER_REPOSITORY,
  FOLLOW_REPOSITORY,
  HIGHLIGHT_SKILL_REPOSITORY,
  USER_RATING_REPOSITORY,
  USER_REPOSITORY,
} from './domain/repositories/tokens';

import { COMMAND_HANDLERS } from './application/commands/command.module';
import { QUERY_HANDLERS } from './application/queries/query.module';

// ── Controllers ─────────────────────────────────────────────────
import { FollowController } from './presentation/http/controllers/follow.controller';
import { RatingController } from './presentation/http/controllers/rating.controller';
import { UserProfileMetadataController } from './presentation/http/controllers/user-profile-metadata.controller';
import { UserController } from './presentation/http/controllers/user.controller';

// ── Event Consumers ─────────────────────────────────────────────
import { HttpModule } from '@nestjs/axios';
import { MESSAGE_COMPONENTS, MESSAGE_CONTROLLERS } from './infrastructure/messaging/message.module';

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
        dbName: 'user_db',
      }),
    }),

    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Career', schema: CareerSchema },
      { name: 'HighlightSkill', schema: HighlightSkillSchema },
      { name: 'Follow', schema: FollowSchema },
      { name: 'UserRating', schema: UserRatingSchema },
    ]),

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
      }),
    }),

    CacheModule.registerAsync({ isGlobal: true, useFactory: async () => await getRedisConfig() }),
    HttpModule,
    CqrsModule,
    TerminusModule,
    MessagingModule,
  ],
  controllers: [
    UserController,
    FollowController,
    RatingController,
    UserProfileMetadataController,
    ...MESSAGE_CONTROLLERS,
    HealthController,
  ],
  providers: [
    ...COMMAND_HANDLERS,
    ...QUERY_HANDLERS,
    ...MESSAGE_COMPONENTS,
    { provide: USER_REPOSITORY, useClass: UserMongoRepository },
    { provide: CAREER_REPOSITORY, useClass: CareerMongoRepository },
    { provide: HIGHLIGHT_SKILL_REPOSITORY, useClass: HighlightSkillMongoRepository },
    { provide: FOLLOW_REPOSITORY, useClass: FollowMongoRepository },
    { provide: USER_RATING_REPOSITORY, useClass: UserRatingMongoRepository },
  ],
})
export class AppModule {}
