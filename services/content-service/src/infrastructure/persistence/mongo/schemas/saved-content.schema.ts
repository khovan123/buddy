import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SavedContentDocument = SavedContent & Document;

@Schema({ collection: 'saved_content', timestamps: true })
export class SavedContent {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  itemId!: string;

  @Prop({ required: true, enum: ['RESOURCE', 'TUTORIAL', 'COLLECTION', 'BUNDLE'] })
  itemType!: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  metadata?: Record<string, unknown>;

  @Prop({ default: Date.now })
  savedAt!: Date;
}

export const SavedContentSchema = SchemaFactory.createForClass(SavedContent);

// Compound index to ensure a user only saves an item once
SavedContentSchema.index({ userId: 1, itemId: 1, itemType: 1 }, { unique: true });
