import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import mongooseAutopopulate from 'mongoose-autopopulate';
import { MongoService } from './mongo.service';
import { Interaction, InteractionSchema } from './schemas/interaction.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
        dbName: 'interaction_db',
      }),
    }),
    MongooseModule.forFeatureAsync([
      {
        name: Interaction.name,
        useFactory: () => {
          const schema = InteractionSchema;
          schema.plugin(mongooseAutopopulate);
          return schema;
        },
      },
    ]),
  ],
  providers: [MongoService],
  exports: [MongoService, MongooseModule],
})
export class MongoModule {}
