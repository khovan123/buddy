"use client"

import { useEffect } from "react"

import type { LearningFitEventName } from "../utils/learning-fit-events"
import { trackLearningFitEvent } from "../utils/learning-fit-events"

interface FitAnalyticsProps {
  event: LearningFitEventName
  payload: Record<string, boolean | number | string | null | undefined>
  enabled?: boolean
  onceKey?: string
}

export function FitAnalytics({
  event,
  payload,
  enabled = true,
  onceKey,
}: FitAnalyticsProps) {
  useEffect(() => {
    if (!enabled) {
      return
    }

    if (onceKey) {
      const storageKey = `buddy:fit:${event}:${onceKey}`
      if (sessionStorage.getItem(storageKey)) {
        return
      }
      sessionStorage.setItem(storageKey, "1")
    }

    trackLearningFitEvent(event, payload)
  }, [enabled, event, onceKey, payload])

  return null
}
