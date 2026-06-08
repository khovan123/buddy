import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ForumTopicDocument = HydratedDocument<ForumTopic>;

@Schema({ timestamps: true, collection: 'forum_topics' })
export class ForumTopic {
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({ type: String, required: true, trim: true, maxlength: 160 })
  title!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 1000 })
  excerpt!: string;

  @Prop({ type: String, index: true })
  authorId?: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  authorName!: string;

  @Prop({ type: String, default: 'New', trim: true, maxlength: 48 })
  tag!: string;

  @Prop({ type: Number, default: 0, min: 0 })
  replyCount!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  viewCount!: number;

  @Prop({ type: Boolean, default: false, index: true })
  trending!: boolean;

  @Prop({ type: Date, default: Date.now, index: true })
  lastActivityAt!: Date;
}

export const ForumTopicSchema = SchemaFactory.createForClass(ForumTopic);

ForumTopicSchema.index({ createdAt: -1 });
ForumTopicSchema.index({ lastActivityAt: -1 });
ForumTopicSchema.index({ trending: 1, lastActivityAt: -1 });
