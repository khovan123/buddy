import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum ProcessedMessageStatus {
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
}

/** Represents the  processed message component. */
@Schema({ timestamps: true, collection: 'ProcessedMessages' })
export class ProcessedMessage {
  @Prop({ type: String, required: true })
  correlationId!: string;

  @Prop({ type: String, required: true })
  routingKey!: string;

  @Prop({ type: String, required: true })
  eventName!: string;

  @Prop({ type: String, required: true })
  serviceName!: string;

  @Prop({ type: String, enum: ProcessedMessageStatus, default: ProcessedMessageStatus.PROCESSING })
  status!: ProcessedMessageStatus;

  @Prop({ type: Date, default: null })
  processedAt?: Date | null;

  @Prop({ type: Date, default: null })
  expiresAt?: Date | null;
}

export type ProcessedMessageDocument = HydratedDocument<ProcessedMessage>;
export const ProcessedMessageSchema = SchemaFactory.createForClass(ProcessedMessage);

ProcessedMessageSchema.index(
  { correlationId: 1, eventName: 1, serviceName: 1 },
  { unique: true, name: 'uq_processed_message_correlation_event_service' },
);

ProcessedMessageSchema.index(
  { correlationId: 1, routingKey: 1, serviceName: 1 },
  { name: 'idx_processed_message_correlation_routing_service' },
);

const cleanupTtlDays = process.env.CLEANUP_TTL_DAYS;
if (!cleanupTtlDays) {
  throw new Error('Need CLEANUP_TTL_DAYS config');
}

const ttlDays = Number(cleanupTtlDays);
if (!Number.isFinite(ttlDays) || ttlDays <= 0) {
  throw new Error('CLEANUP_TTL_DAYS must be a positive number');
}

const ttlSeconds = Math.floor(ttlDays * 24 * 60 * 60);

ProcessedMessageSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: ttlSeconds,
    name: 'idx_processed_message_ttl',
    partialFilterExpression: { expiresAt: { $type: 'date' } },
  },
);
