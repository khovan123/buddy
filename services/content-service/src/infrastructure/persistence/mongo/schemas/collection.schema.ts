import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export enum CollectionType {
  RESOURCE = 'RESOURCE',
  TUTORIAL = 'TUTORIAL',
}

export enum CollectionStatus {
  AVAILABLE = 'AVAILABLE',
  BANNED = 'BANNED',
  DELETED = 'DELETED',
}

export enum CollectionPhaseItemType {
  RESOURCE = 'RESOURCE',
  TUTORIAL = 'TUTORIAL',
}

/** Sub-document: a single item inside a Collection Phase. */
@Schema({ _id: false })
export class CollectionPhaseItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  itemId!: string;

  @Prop({ type: String, enum: CollectionPhaseItemType, required: true })
  itemType!: CollectionPhaseItemType;
}

export const CollectionPhaseItemSchema = SchemaFactory.createForClass(CollectionPhaseItem);

/** Sub-document: a Phase (stage) inside a Collection Roadmap. */
@Schema({ _id: false })
export class CollectionPhase {
  @Prop({ type: String, required: true })
  phaseTitle!: string;

  @Prop({ type: String, default: '' })
  learningGoal!: string;

  @Prop({ type: [CollectionPhaseItemSchema], default: [] })
  items!: CollectionPhaseItem[];
}

export const CollectionPhaseSchema = SchemaFactory.createForClass(CollectionPhase);

/** Represents the  collection component. */
@Schema({ timestamps: true, collection: 'Collections' })
export class Collection {
  @Prop({ type: String, required: true })
  userId!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ required: true, unique: true, trim: true, index: true })
  slug!: string; // SEO-friendly URL slug (auto-generated from title)

  @Prop({ type: String, required: true })
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

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Resource' }],
    default: [],
  })
  resourceIds!: string[];

  @Prop({ type: String, enum: CollectionType, required: true })
  type!: CollectionType;

  @Prop({
    type: Number,
    required: true,
    default: function (this: Collection) {
      return this.type === CollectionType.TUTORIAL ? 20 : 10;
    },
  })
  discount!: number;

  @Prop({ type: String, enum: CollectionStatus, default: CollectionStatus.AVAILABLE })
  status!: CollectionStatus;

  @Prop({ type: Date, default: new Date() })
  createdAt?: Date;

  @Prop({ type: Date, default: new Date() })
  updatedAt?: Date;

  @Prop({ type: String, required: false, default: null })
  thumbnailUrl?: string;

  @Prop({ type: Date, default: null })
  deletedAt?: Date;

  @Prop({ type: [CollectionPhaseSchema], default: undefined })
  phases?: CollectionPhase[];
}

export type CollectionDocument = HydratedDocument<Collection>;
export const CollectionSchema = SchemaFactory.createForClass(Collection);
CollectionSchema.index({ title: 1 }, { unique: true });
CollectionSchema.index({ majorId: 1, courseId: 1 });

// Virtual: populate Major
CollectionSchema.virtual('major', {
  ref: 'Major',
  localField: 'majorId',
  foreignField: '_id',
  justOne: true,
});

// Virtual: populate Course
CollectionSchema.virtual('course', {
  ref: 'Course',
  localField: 'courseId',
  foreignField: '_id',
  justOne: true,
});

// Virtual: populate Resources
CollectionSchema.virtual('resources', {
  ref: 'Resource',
  localField: 'resourceIds',
  foreignField: '_id',
});

CollectionSchema.virtual('tutorials', {
  ref: 'Tutorial',
  localField: '_id',
  foreignField: 'collectionId',
});

// Đảm bảo virtuals được hiển thị khi convert ra JSON/Object
CollectionSchema.set('toJSON', { virtuals: true });
CollectionSchema.set('toObject', { virtuals: true });

CollectionSchema.pre('save', function () {
  if (this.type === CollectionType.TUTORIAL && this.discount < 20) {
    return new Error('Discount cho bộ Tutorial phải tối thiểu 20%');
  }
});
