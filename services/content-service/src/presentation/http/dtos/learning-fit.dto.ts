import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import {
  FitStatus,
  FitEvidenceSourceType,
  LearningFit,
  LearningFitDifficulty,
  StartHereTargetType,
} from '../../../domain/entities/learning-fit';

const toTrimmedArray = (value: unknown): string[] => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw.map((item) => item?.toString().trim()).filter(Boolean);
};

export class StartHereStepDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Transform(({ value }) => value?.trim())
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsInt()
  @Min(1)
  @Max(20)
  @Transform(({ value }) => Number.parseInt(value?.toString(), 10))
  order!: number;

  @IsOptional()
  @IsEnum(StartHereTargetType)
  targetType?: StartHereTargetType;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  targetId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  @Transform(({ value }) => value?.trim())
  aiPrompt?: string;
}

export class FitEvidenceDto {
  @IsString()
  @MinLength(8)
  @MaxLength(180)
  @Transform(({ value }) => value?.trim())
  claim!: string;

  @IsEnum(FitEvidenceSourceType)
  sourceType!: FitEvidenceSourceType;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  sourceRef?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Transform(({ value }) => Number.parseFloat(value?.toString()))
  confidence?: number;
}

export class LearningFitDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MinLength(8, { each: true })
  @MaxLength(160, { each: true })
  @Transform(({ value }) => toTrimmedArray(value))
  bestFor!: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MinLength(8, { each: true })
  @MaxLength(160, { each: true })
  @Transform(({ value }) => toTrimmedArray(value))
  notFor!: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => StartHereStepDto)
  startHere!: StartHereStepDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  @Transform(({ value }) => toTrimmedArray(value))
  coveredTopics?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  @Transform(({ value }) => toTrimmedArray(value))
  notCoveredTopics?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  @Transform(({ value }) => toTrimmedArray(value))
  learningOutcomes?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  @Transform(({ value }) => Number.parseInt(value?.toString(), 10))
  estimatedStudyTimeMinutes?: number;

  @IsOptional()
  @IsEnum(LearningFitDifficulty)
  difficulty?: LearningFitDifficulty;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => FitEvidenceDto)
  fitEvidence?: FitEvidenceDto[];

  @IsOptional()
  @IsDateString()
  fitGeneratedAt?: string;

  @IsOptional()
  @IsDateString()
  fitVerifiedAt?: string;
}

export const toLearningFit = (dto?: LearningFitDto): LearningFit | undefined => {
  if (!dto) return undefined;

  const bestFor = dto.bestFor ?? [];
  const notFor = dto.notFor ?? [];
  const startHere = dto.startHere ?? [];
  const isVerifiedBasic = bestFor.length > 0 && notFor.length > 0 && startHere.length > 0;
  const fitEvidence = dto.fitEvidence ?? [];
  const hasEvidence = fitEvidence.some((item) => item.claim && item.sourceType);
  const fitStatus = isVerifiedBasic
    ? hasEvidence
      ? FitStatus.VERIFIED
      : FitStatus.NEEDS_EVIDENCE
    : FitStatus.DRAFT;

  return {
    bestFor,
    notFor,
    startHere: startHere
      .map((step, index) => ({
        title: step.title,
        description: step.description,
        order: step.order ?? index + 1,
        targetType: step.targetType,
        targetId: step.targetId,
        aiPrompt: step.aiPrompt,
      }))
      .sort((a, b) => a.order - b.order),
    coveredTopics: dto.coveredTopics ?? [],
    notCoveredTopics: dto.notCoveredTopics ?? [],
    learningOutcomes: dto.learningOutcomes ?? [],
    estimatedStudyTimeMinutes: dto.estimatedStudyTimeMinutes ?? null,
    difficulty: dto.difficulty ?? null,
    fitStatus,
    fitEvidence,
    fitGeneratedAt: dto.fitGeneratedAt ? new Date(dto.fitGeneratedAt) : null,
    fitVerifiedAt:
      fitStatus === FitStatus.VERIFIED
        ? dto.fitVerifiedAt
          ? new Date(dto.fitVerifiedAt)
          : new Date()
        : null,
  };
};
