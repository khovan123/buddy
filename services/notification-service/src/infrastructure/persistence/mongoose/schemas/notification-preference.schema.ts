import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, collection: 'NotificationPreferences' })
export class NotificationPreference {
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({ type: String, required: true, unique: true, index: true })
  userId!: string;

  @Prop({ type: Boolean, default: true })
  productUpdates!: boolean;

  @Prop({ type: Boolean, default: true })
  learningReminders!: boolean;

  @Prop({ type: Boolean, default: true })
  walletEvents!: boolean;

  @Prop({ type: Boolean, default: true })
  creatorSales!: boolean;

  @Prop({ type: Boolean, default: false })
  weeklyDigest!: boolean;
}

export type NotificationPreferenceDocument = HydratedDocument<NotificationPreference>;
export const NotificationPreferenceSchema = SchemaFactory.createForClass(NotificationPreference);
