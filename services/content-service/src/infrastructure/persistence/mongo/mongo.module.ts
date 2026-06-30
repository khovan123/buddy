import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import mongooseAutopopulate from 'mongoose-autopopulate';
import { MongoService } from './mongo.service';
import { Collection, CollectionSchema } from './schemas/collection.schema';
import { Course, CourseSchema } from './schemas/course.schema';
import { Major, MajorSchema } from './schemas/major.schema';
import { ProcessedMessage, ProcessedMessageSchema } from './schemas/processed-message.schema';
import { Resource, ResourceSchema } from './schemas/resource.schema';
import { Tutorial, TutorialSchema } from './schemas/tutorial.schema';
import { SavedContent, SavedContentSchema } from './schemas/saved-content.schema';
import { SystemSetting, SystemSettingSchema } from './schemas/system-setting.schema';

/** NestJS Module for  mongo. */
@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
        dbName: 'content_db',
        retryWrites: false,
      }),
    }),

    MongooseModule.forFeatureAsync([
      {
        name: Resource.name,
        useFactory: () => {
          const schema = ResourceSchema;
          schema.plugin(mongooseAutopopulate);
          return schema;
        },
      },
      {
        name: Tutorial.name,
        useFactory: () => {
          const schema = TutorialSchema;
          schema.plugin(mongooseAutopopulate);
          return schema;
        },
      },
      {
        name: Collection.name,
        useFactory: () => {
          const schema = CollectionSchema;
          schema.plugin(mongooseAutopopulate);
          return schema;
        },
      },
      {
        name: Major.name,
        useFactory: () => {
          const schema = MajorSchema;
          schema.plugin(mongooseAutopopulate);
          return schema;
        },
      },
      {
        name: Course.name,
        useFactory: () => {
          const schema = CourseSchema;
          schema.plugin(mongooseAutopopulate);
          return schema;
        },
      },
      {
        name: ProcessedMessage.name,
        useFactory: () => ProcessedMessageSchema,
      },
      {
        name: SavedContent.name,
        useFactory: () => SavedContentSchema,
      },
      {
        name: SystemSetting.name,
        useFactory: () => SystemSettingSchema,
      },
    ]),
  ],
  providers: [MongoService],
  exports: [MongoService, MongooseModule],
})
export class MongoModule {}
