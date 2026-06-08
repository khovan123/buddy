import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ForumMessageDocument = HydratedDocument<ForumMessage>;

@Schema({ timestamps: true, collection: 'forum_messages' })
export class ForumMessage {
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({ type: String, index: true })
  topicId?: string;

  @Prop({ type: String, index: true })
  authorId?: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  authorName!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 1000 })
  message!: string;
}

export const ForumMessageSchema = SchemaFactory.createForClass(ForumMessage);

ForumMessageSchema.index({ createdAt: -1 });
ForumMessageSchema.index({ topicId: 1, createdAt: 1 });
