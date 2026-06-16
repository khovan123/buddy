import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import {
  FitEvidenceSourceType,
  FitStatus,
  LearningFitDifficulty,
  StartHereTargetType,
} from '../../../../domain/entities/learning-fit';

@Schema({ _id: false })
export class StartHereStep {
  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, default: '' })
  description?: string;

  @Prop({ type: Number, required: true })
  order!: number;

  @Prop({ type: String, enum: StartHereTargetType, default: null })
  targetType?: StartHereTargetType | null;

  @Prop({ type: String, default: null })
  targetId?: string | null;

  @Prop({ type: String, default: null })
  aiPrompt?: string | null;
}

export const StartHereStepSchema = SchemaFactory.createForClass(StartHereStep);

@Schema({ _id: false })
export class FitEvidence {
  @Prop({ type: String, required: true })
  claim!: string;

  @Prop({ type: String, enum: FitEvidenceSourceType, required: true })
  sourceType!: FitEvidenceSourceType;

  @Prop({ type: String, default: null })
  sourceRef?: string | null;

  @Prop({ type: Number, default: null })
  confidence?: number | null;
}

export const FitEvidenceSchema = SchemaFactory.createForClass(FitEvidence);

@Schema({ _id: false })
export class LearningFit {
  @Prop({ type: [String], default: [] })
  bestFor!: string[];

  @Prop({ type: [String], default: [] })
  notFor!: string[];

  @Prop({ type: [StartHereStepSchema], default: [] })
  startHere!: StartHereStep[];

  @Prop({ type: [String], default: [] })
  coveredTopics!: string[];

  @Prop({ type: [String], default: [] })
  notCoveredTopics!: string[];

  @Prop({ type: [String], default: [] })
  learningOutcomes!: string[];

  @Prop({ type: Number, default: null })
  estimatedStudyTimeMinutes?: number | null;

  @Prop({ type: String, enum: LearningFitDifficulty, default: null })
  difficulty?: LearningFitDifficulty | null;

  @Prop({ type: String, enum: FitStatus, default: FitStatus.DRAFT })
  fitStatus!: FitStatus;

  @Prop({ type: [FitEvidenceSchema], default: [] })
  fitEvidence!: FitEvidence[];

  @Prop({ type: Date, default: null })
  fitGeneratedAt?: Date | null;

  @Prop({ type: Date, default: null })
  fitVerifiedAt?: Date | null;
}

export const LearningFitSchema = SchemaFactory.createForClass(LearningFit);
