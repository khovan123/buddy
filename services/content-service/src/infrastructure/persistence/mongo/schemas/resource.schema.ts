import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export enum ResourceStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  AVAILABLE = 'AVAILABLE',
  FAILED = 'FAILED',
  BANNED = 'BANNED',
  DELETED = 'DELETED',
}

export enum ContentModerationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  ERROR = 'ERROR',
}

/** Represents the  resource meta component. */
@Schema({ _id: false })
export class ResourceMeta {
  @Prop({ type: String, required: true })
  fileId!: string;

  @Prop({ type: String, required: false, default: '' })
  downloadUrl?: string;

  @Prop({ type: Number, required: true })
  fileSize!: number;

  @Prop({ type: String, required: true })
  extension!: string;
}

/** Represents the  resource component. */
@Schema({ timestamps: true, collection: 'Resources' })
export class Resource {
  @Prop({ type: String, required: true })
  userId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, unique: true, trim: true, index: true })
  slug!: string; // SEO-friendly URL slug (auto-generated from title)

  @Prop({ required: true })
  summary!: string;

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

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ type: String, enum: ResourceStatus, default: ResourceStatus.AVAILABLE })
  status!: ResourceStatus;

  @Prop({
    type: String,
    enum: ContentModerationStatus,
    default: ContentModerationStatus.PENDING,
  })
  moderationStatus!: ContentModerationStatus;

  @Prop({ type: Number, required: false, default: null })
  moderationScore?: number | null;

  @Prop({ type: [String], default: [] })
  moderationReasons?: string[];

  @Prop({ type: String, required: false, default: null })
  moderationRuleVersion?: string | null;

  @Prop({ type: Date, default: null })
  moderatedAt?: Date | null;

  @Prop({ default: false })
  isVerified!: boolean;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Tutorial',
    default: null,
  })
  tutorialId?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Collection',
    default: null,
  })
  collectionId?: string;

  @Prop({ type: [ResourceMeta], required: true })
  meta!: ResourceMeta[];

  @Prop({ type: String, required: false, default: null })
  thumbnailUrl?: string;

  // ─── Preview Optimization ──────────────────────────────────────
  // Caches meta[0].s3Key from upload-service for direct preview lookup (no extra DB round-trip)
  @Prop({ type: String, required: false, default: null })
  primaryS3Key?: string;

  @Prop({ type: Date, default: null })
  deletedAt?: Date;
}

export type ResourceDocument = HydratedDocument<Resource>;
export const ResourceSchema = SchemaFactory.createForClass(Resource);
ResourceSchema.index({ majorId: 1, courseId: 1 });

// Virtual: populate Major
ResourceSchema.virtual('major', {
  ref: 'Major',
  localField: 'majorId',
  foreignField: '_id',
  justOne: true,
});

// Virtual: populate Course
ResourceSchema.virtual('course', {
  ref: 'Course',
  localField: 'courseId',
  foreignField: '_id',
  justOne: true,
});

ResourceSchema.virtual('tutorial', {
  ref: 'Tutorial',
  localField: 'tutorialId',
  foreignField: '_id',
  justOne: true,
});

ResourceSchema.virtual('collection', {
  ref: 'Collection',
  localField: 'collectionId',
  foreignField: '_id',
  justOne: true,
});

// Đảm bảo virtuals được hiển thị khi convert ra JSON/Object
ResourceSchema.set('toJSON', { virtuals: true });
ResourceSchema.set('toObject', { virtuals: true });
