import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true, collection: 'Notifications' })
export class Notification {
  createdAt!: Date;
  updatedAt!: Date;
  @Prop({ type: String, required: true })
  userId!: string;

  @Prop({ type: String, required: true, enum: ['email', 'push', 'sms', 'in_app'] })
  type!: string;

  @Prop({ type: String, required: true })
  channel!: string;

  @Prop({ type: String, required: true })
  recipient!: string;

  @Prop({ type: String })
  subject?: string;

  @Prop({ type: String, required: true })
  templateId!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  templateData!: Record<string, unknown>;

  @Prop({
    type: String,
    required: true,
    enum: ['pending', 'sent', 'failed', 'delivered'],
    default: 'pending',
  })
  status!: string;

  @Prop({ type: Number, default: 0 })
  attempts!: number;

  @Prop({ type: Number, default: 3 })
  maxAttempts!: number;

  @Prop({ type: Date })
  lastAttemptAt?: Date;

  @Prop({ type: Date })
  sentAt?: Date;

  @Prop({ type: Date, default: null })
  readAt?: Date | null;

  @Prop({ type: String })
  errorMessage?: string;

  @Prop({ type: String, index: true })
  correlationId?: string;
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, readAt: 1 });
NotificationSchema.index({ status: 1, attempts: 1 });

NotificationSchema.set('toJSON', { virtuals: true });
NotificationSchema.set('toObject', { virtuals: true });
