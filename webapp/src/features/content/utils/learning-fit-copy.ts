import type { CollectionPhase, LearningFit } from "../types"

export type LearningFitContentType = "collection" | "resource" | "tutorial"

export function getFitAwarePurchaseLabel({
  contentType,
  fit,
}: {
  contentType: LearningFitContentType
  fit?: LearningFit | null
}) {
  const firstStep = fit?.startHere?.[0]
  if (firstStep?.title) {
    if (contentType === "collection") {
      return "Start this learning path"
    }

    if (contentType === "tutorial") {
      return "Buy & start lesson 1"
    }

    return "Buy & start review"
  }

  if (contentType === "collection") {
    return "Start this learning path"
  }

  if (contentType === "tutorial") {
    return "Start guided tutorial"
  }

  return "Buy & start review"
}

export function getFitAwareFreeLabel(contentType: LearningFitContentType) {
  if (contentType === "collection") {
    return "Start this learning path"
  }

  if (contentType === "tutorial") {
    return "Start guided tutorial"
  }

  return "Start this study step"
}

export function getLearningPathStats(phases?: CollectionPhase[] | null) {
  const safePhases = phases ?? []
  const itemCount = safePhases.reduce(
    (total, phase) => total + phase.items.length,
    0
  )
  const firstCheckpoint = safePhases.find((phase) => phase.items.length > 0)

  return {
    checkpointCount: safePhases.length,
    itemCount,
    firstCheckpointTitle: firstCheckpoint?.phaseTitle,
    hasPath: safePhases.length > 0,
  }
}
