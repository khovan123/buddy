import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { InteractionAction } from '@libs/contracts';

export type InteractionDocument = HydratedDocument<Interaction>;

/** Runtime values for InteractionContentType (type union in contracts has no runtime presence). */
export const INTERACTION_CONTENT_TYPES = [
  'RESOURCE',
  'TUTORIAL',
  'RESOURCE_COLLECTION',
  'TUTORIAL_COLLECTION',
] as const;

@Schema({ timestamps: true, collection: 'interactions' })
export class Interaction {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, index: true })
  itemId!: string;

  @Prop({ required: true, enum: INTERACTION_CONTENT_TYPES })
  itemType!: string;

  @Prop({ required: true, enum: Object.values(InteractionAction) })
  action!: string;

  @Prop({ required: true })
  weight!: number;

  @Prop({ type: Object })
  metadata?: {
    ratingValue?: number;
    commentId?: string;
    majorId?: string;
    courseId?: string;
    semester?: number;
  };
}

export const InteractionSchema = SchemaFactory.createForClass(Interaction);

// Compound indexes for query performance
InteractionSchema.index({ userId: 1, createdAt: -1 });
InteractionSchema.index({ itemId: 1, action: 1 });
InteractionSchema.index({ userId: 1, itemId: 1, action: 1 });
InteractionSchema.index({ 'metadata.majorId': 1, createdAt: -1 });

// TTL index: auto-delete raw events after 90 days (recommendation_db keeps aggregated data)
InteractionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });
