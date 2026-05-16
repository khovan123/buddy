import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { HighlightSkillStatus } from '../../../../domain/entities/highlight-skill.entity';

@Schema({ timestamps: true, collection: 'HighlightSkills' })
export class HighlightSkill {
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Career', required: true })
  careerId!: string;

  @Prop({ type: String, enum: HighlightSkillStatus, default: HighlightSkillStatus.ACTIVE })
  status!: HighlightSkillStatus;
}

export type HighlightSkillDocument = HydratedDocument<HighlightSkill>;
export const HighlightSkillSchema = SchemaFactory.createForClass(HighlightSkill);

HighlightSkillSchema.index({ careerId: 1 });
HighlightSkillSchema.index({ name: 'text' });
HighlightSkillSchema.index({ status: 1 });

HighlightSkillSchema.set('toJSON', { virtuals: true });
HighlightSkillSchema.set('toObject', { virtuals: true });
