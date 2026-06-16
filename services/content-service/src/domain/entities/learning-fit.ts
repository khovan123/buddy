export enum FitStatus {
  DRAFT = 'DRAFT',
  NEEDS_EVIDENCE = 'NEEDS_EVIDENCE',
  VERIFIED = 'VERIFIED',
  EXPIRED = 'EXPIRED',
}

export enum LearningFitDifficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum StartHereTargetType {
  SECTION = 'SECTION',
  FILE = 'FILE',
  VIDEO_STEP = 'VIDEO_STEP',
  COLLECTION_PHASE = 'COLLECTION_PHASE',
  AI_PROMPT = 'AI_PROMPT',
}

export enum FitEvidenceSourceType {
  METADATA = 'METADATA',
  CONTENT_EXTRACTION = 'CONTENT_EXTRACTION',
  CREATOR_INPUT = 'CREATOR_INPUT',
  AI_GENERATED = 'AI_GENERATED',
  MODERATION = 'MODERATION',
}

export interface StartHereStep {
  title: string;
  description?: string;
  order: number;
  targetType?: StartHereTargetType;
  targetId?: string;
  aiPrompt?: string;
}

export interface FitEvidence {
  claim: string;
  sourceType: FitEvidenceSourceType;
  sourceRef?: string;
  confidence?: number | null;
}

export interface LearningFit {
  bestFor: string[];
  notFor: string[];
  startHere: StartHereStep[];
  coveredTopics: string[];
  notCoveredTopics: string[];
  learningOutcomes: string[];
  estimatedStudyTimeMinutes?: number | null;
  difficulty?: LearningFitDifficulty | null;
  fitStatus: FitStatus;
  fitEvidence?: FitEvidence[];
  fitGeneratedAt?: Date | null;
  fitVerifiedAt?: Date | null;
}
