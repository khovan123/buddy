import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, collection: 'UserRatings' })
export class UserRating {
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({ type: String, required: true })
  raterId!: string;

  @Prop({ type: String, required: true })
  targetId!: string;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  score!: number;

  @Prop({ type: String, maxlength: 500 })
  comment?: string;
}

export type UserRatingDocument = HydratedDocument<UserRating>;
export const UserRatingSchema = SchemaFactory.createForClass(UserRating);

UserRatingSchema.index({ raterId: 1, targetId: 1 }, { unique: true });
UserRatingSchema.index({ targetId: 1, createdAt: -1 });

UserRatingSchema.set('toJSON', { virtuals: true });
UserRatingSchema.set('toObject', { virtuals: true });
