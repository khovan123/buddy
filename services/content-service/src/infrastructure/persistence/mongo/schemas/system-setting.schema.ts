import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, collection: 'SystemSettings' })
export class SystemSetting {
  @Prop({ type: String, required: true, unique: true, trim: true, index: true })
  key!: string;

  @Prop({ type: Object, required: true })
  value!: Record<string, unknown>;

  @Prop({ type: String, required: false, default: null })
  updatedBy?: string | null;

  updatedAt?: Date;
}

export type SystemSettingDocument = HydratedDocument<SystemSetting>;
export const SystemSettingSchema = SchemaFactory.createForClass(SystemSetting);
