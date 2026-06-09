import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { usernameSeedFromEmail } from '../../../../domain/value-objects/username.vo';

@Schema({ _id: false })
class UserProfile {
  @Prop({ type: String, required: true, trim: true })
  nickname!: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String, maxlength: 500 })
  bio?: string;

  @Prop({ type: String })
  avatarUrl?: string;

  @Prop({ type: Date })
  dateOfBirth?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  majorId?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  courseId?: string;

  @Prop({ type: Number })
  semester?: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Career' })
  careerId?: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'HighlightSkill' }] })
  skillIds?: string[];
}

@Schema({ timestamps: true, collection: 'Users' })
export class User {
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({ type: String, required: true, unique: true })
  userId!: string;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  username!: string;

  @Prop({ type: UserProfile })
  profile!: UserProfile;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index(
  { username: 1 },
  { unique: true, partialFilterExpression: { username: { $type: 'string' } } },
);
UserSchema.index({ isActive: 1 });
UserSchema.index({ username: 'text', 'profile.nickname': 'text' });

UserSchema.pre('validate', function () {
  if (!this.username && this.email) {
    this.username = usernameSeedFromEmail(this.email);
  }
});

UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });
