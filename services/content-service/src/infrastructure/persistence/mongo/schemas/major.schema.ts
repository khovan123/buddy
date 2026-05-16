import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { MajorStatus } from '../../../../domain/entities/major.entity';

/** Represents the  major component. */
@Schema({ timestamps: true, collection: 'Majors' })
export class Major {
  @Prop({ required: true, unique: true, trim: true })
  code!: string; // Mã ngành (vd: SE, CS)

  @Prop({ required: true, trim: true })
  name!: string; // Tên ngành (vd: Kỹ thuật phần mềm)

  @Prop({ required: true })
  description!: string;

  @Prop({ type: String, enum: MajorStatus, default: MajorStatus.ACTIVE })
  status!: MajorStatus;

  @Prop({ type: Date, default: null })
  deletedAt?: Date;
}

export type MajorDocument = HydratedDocument<Major>;
export const MajorSchema = SchemaFactory.createForClass(Major);
