import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export enum TutorialStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  AVAILABLE = 'AVAILABLE',
  FAILED = 'FAILED',
  BANNED = 'BANNED',
  DELETED = 'DELETED',
}

/** Represents the  media meta component. */
@Schema({ _id: false })
class MediaMeta {
  @Prop({ type: String, required: true })
  fileId!: string;

  @Prop({ type: String, default: null })
  videoUrl?: string | null;

  @Prop({ type: String, default: null })
  streamingUrl?: string | null;

  @Prop({ type: String, default: null })
  trailerUrl?: string | null;

  @Prop({ type: Number, required: true })
  duration!: number;

  @Prop({ type: Number, required: true })
  fileSize!: number;

  @Prop({ type: String, required: true })
  extension!: string;
}

/** Represents a resource inside a tutorial step */
@Schema({ _id: false })
export class TutorialStepResource {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Resource', required: true })
  resourceId!: string;

  @Prop({ type: String, default: '' })
  instructionNote!: string;
}
export const TutorialStepResourceSchema = SchemaFactory.createForClass(TutorialStepResource);

TutorialStepResourceSchema.virtual('resource', {
  ref: 'Resource',
  localField: 'resourceId',
  foreignField: '_id',
  justOne: true,
});

TutorialStepResourceSchema.set('toJSON', { virtuals: true });
TutorialStepResourceSchema.set('toObject', { virtuals: true });

/** Represents a structured step in the tutorial containing ordered resources */
@Schema({ _id: true, timestamps: true })
export class TutorialStep {
  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: [TutorialStepResourceSchema], default: [] })
  resources!: TutorialStepResource[];
}
export const TutorialStepSchema = SchemaFactory.createForClass(TutorialStep);

/** Represents the  tutorial component. */
@Schema({ timestamps: true, collection: 'Tutorials' })
export class Tutorial {
  @Prop({ type: String, required: true })
  userId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, unique: true, trim: true, index: true })
  slug!: string; // SEO-friendly URL slug (auto-generated from title)

  @Prop({ required: true })
  description!: string;

  @Prop({ type: [String], required: true })
  hightlights!: [string];

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Major',
    required: true,
  })
  majorId!: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Course',
    required: true,
  })
  courseId!: string;

  @Prop({ type: MediaMeta, required: true })
  media!: MediaMeta;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ default: false })
  isVerified!: boolean;

  @Prop({ type: String, enum: TutorialStatus, default: TutorialStatus.AVAILABLE })
  status!: TutorialStatus;

  @Prop({ default: 15, min: 15 })
  discountBundle!: number;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Collection',
    default: null,
  })
  collectionId?: string;

  @Prop({
    type: [MongooseSchema.Types.ObjectId],
    ref: 'Resource',
    default: null,
  })
  resourceIds?: string[];

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Collection' }],
    default: [],
  })
  collectionIds?: string[];

  @Prop({ type: [TutorialStepSchema], default: [] })
  steps?: TutorialStep[];

  @Prop({ type: Date, default: null })
  deletedAt?: Date;
}

export type TutorialDocument = HydratedDocument<Tutorial>;
export const TutorialSchema = SchemaFactory.createForClass(Tutorial);
TutorialSchema.index({ majorId: 1, courseId: 1 });

// Virtual: populate Resources (by resourceIds)
TutorialSchema.virtual('resources', {
  ref: 'Resource',
  localField: 'resourceIds',
  foreignField: '_id',
});

// Virtual: populate single Collection (legacy collectionId)
TutorialSchema.virtual('collection', {
  ref: 'Collection',
  localField: 'collectionId',
  foreignField: '_id',
  justOne: true,
});

// Virtual: populate Collections (by collectionIds)
TutorialSchema.virtual('collections', {
  ref: 'Collection',
  localField: 'collectionIds',
  foreignField: '_id',
});

// Virtual: populate Major
TutorialSchema.virtual('major', {
  ref: 'Major',
  localField: 'majorId',
  foreignField: '_id',
  justOne: true,
});

// Virtual: populate Course
TutorialSchema.virtual('course', {
  ref: 'Course',
  localField: 'courseId',
  foreignField: '_id',
  justOne: true,
});

// Đảm bảo virtuals được hiển thị khi convert ra JSON/Object
TutorialSchema.set('toJSON', { virtuals: true });
TutorialSchema.set('toObject', { virtuals: true });
