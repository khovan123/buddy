import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'Follows' })
export class Follow {
  createdAt!: Date;

  @Prop({ type: String, required: true })
  followerId!: string;

  @Prop({ type: String, required: true })
  followingId!: string;
}

export type FollowDocument = HydratedDocument<Follow>;
export const FollowSchema = SchemaFactory.createForClass(Follow);

FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
FollowSchema.index({ followingId: 1, createdAt: -1 });
FollowSchema.index({ followerId: 1, createdAt: -1 });

FollowSchema.set('toJSON', { virtuals: true });
FollowSchema.set('toObject', { virtuals: true });
