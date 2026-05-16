import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { CareerStatus } from '../../../../domain/entities/career.entity';

@Schema({ timestamps: true, collection: 'Careers' })
export class Career {
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true, trim: true })
  description!: string;

  @Prop({ type: String, enum: CareerStatus, default: CareerStatus.ACTIVE })
  status!: CareerStatus;
}

export type CareerDocument = HydratedDocument<Career>;
export const CareerSchema = SchemaFactory.createForClass(Career);

CareerSchema.index({ name: 'text' });
CareerSchema.index({ status: 1 });

CareerSchema.set('toJSON', { virtuals: true });
CareerSchema.set('toObject', { virtuals: true });
