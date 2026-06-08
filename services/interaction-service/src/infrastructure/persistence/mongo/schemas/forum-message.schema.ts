import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ForumMessageDocument = HydratedDocument<ForumMessage>;

export class ForumMention {
  userId!: string;
  name!: string;
  avatarUrl?: string;
}

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

  @Prop({
    type: [
      {
        userId: { type: String, required: true },
        name: { type: String, required: true, trim: true, maxlength: 120 },
        avatarUrl: { type: String, trim: true, maxlength: 500 },
      },
    ],
    default: [],
  })
  mentions!: ForumMention[];
}

export const ForumMessageSchema = SchemaFactory.createForClass(ForumMessage);

ForumMessageSchema.index({ createdAt: -1 });
ForumMessageSchema.index({ topicId: 1, createdAt: 1 });
