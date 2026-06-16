import type { LearningFitFormValues } from "../schema"
import {
  FitStatus,
  type FitEvidence,
  type LearningFit,
  type StartHereStep,
} from "../types"

const values = (items?: Array<{ value: string }>) =>
  (items ?? []).map((item) => item.value.trim()).filter(Boolean)

const evidence = (items?: FitEvidence[]) =>
  (items ?? []).filter((item) => item.claim.trim() && item.sourceType)

export function toLearningFitPayload(
  fit?: LearningFitFormValues
): LearningFit | undefined {
  if (!fit) {
    return undefined
  }

  const bestFor = values(fit.bestFor)
  const notFor = values(fit.notFor)
  const startHere = (fit.startHere ?? [])
    .filter((step) => step.title.trim())
    .map<StartHereStep>((step, index) => ({
      title: step.title.trim(),
      description: step.description?.trim() || undefined,
      order: step.order || index + 1,
      targetType: step.targetType,
      targetId: step.targetId?.trim() || undefined,
      aiPrompt: step.aiPrompt?.trim() || undefined,
    }))
    .sort((a, b) => a.order - b.order)

  const hasRequiredFit =
    bestFor.length > 0 && notFor.length > 0 && startHere.length > 0
  const fitEvidence = evidence(fit.fitEvidence)
  const hasEvidence = fitEvidence.length > 0

  if (
    !hasRequiredFit &&
    values(fit.coveredTopics).length === 0 &&
    values(fit.notCoveredTopics).length === 0 &&
    values(fit.learningOutcomes).length === 0 &&
    !hasEvidence
  ) {
    return undefined
  }

  return {
    bestFor,
    notFor,
    startHere,
    coveredTopics: values(fit.coveredTopics),
    notCoveredTopics: values(fit.notCoveredTopics),
    learningOutcomes: values(fit.learningOutcomes),
    estimatedStudyTimeMinutes: fit.estimatedStudyTimeMinutes,
    difficulty: fit.difficulty,
    fitStatus: hasRequiredFit
      ? hasEvidence
        ? FitStatus.VERIFIED
        : FitStatus.NEEDS_EVIDENCE
      : FitStatus.DRAFT,
    fitEvidence,
    fitGeneratedAt: fit.fitGeneratedAt ?? null,
    fitVerifiedAt:
      hasRequiredFit && hasEvidence ? (fit.fitVerifiedAt ?? null) : null,
  }
}

export function isVerifiedFit(fit?: LearningFit | null) {
  return fit?.fitStatus === FitStatus.VERIFIED
}

export function toLearningFitFormValues(
  fit?: LearningFit | null
): LearningFitFormValues {
  return {
    bestFor: (fit?.bestFor ?? []).map((value) => ({ value })),
    notFor: (fit?.notFor ?? []).map((value) => ({ value })),
    startHere:
      fit?.startHere?.map((step, index) => ({
        title: step.title,
        description: step.description ?? "",
        order: step.order || index + 1,
        targetType: step.targetType,
        targetId: step.targetId ?? "",
        aiPrompt: step.aiPrompt ?? "",
      })) ?? [],
    coveredTopics: (fit?.coveredTopics ?? []).map((value) => ({ value })),
    notCoveredTopics: (fit?.notCoveredTopics ?? []).map((value) => ({
      value,
    })),
    learningOutcomes: (fit?.learningOutcomes ?? []).map((value) => ({
      value,
    })),
    estimatedStudyTimeMinutes:
      fit?.estimatedStudyTimeMinutes === null
        ? undefined
        : fit?.estimatedStudyTimeMinutes,
    difficulty: fit?.difficulty ?? undefined,
    fitEvidence: fit?.fitEvidence ?? [],
    fitGeneratedAt: fit?.fitGeneratedAt ?? null,
    fitVerifiedAt: fit?.fitVerifiedAt ?? null,
  }
}
