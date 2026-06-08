"use client"

import { useEffect } from "react"

import type { InteractionContentType } from "../services/interaction-api"
import { useTrackInteractionMutation } from "../services/interaction-api"

type TrackContentViewProps = {
  itemId: string
  itemType: InteractionContentType
  majorId?: string
  courseId?: string
  semester?: number
}

export function TrackContentView({
  itemId,
  itemType,
  majorId,
  courseId,
  semester,
}: TrackContentViewProps) {
  const [trackInteraction] = useTrackInteractionMutation()

  useEffect(() => {
    const key = `buddy:view:${itemType}:${itemId}`
    if (sessionStorage.getItem(key)) {
      return
    }

    sessionStorage.setItem(key, "1")
    void trackInteraction({
      itemId,
      itemType,
      action: "VIEW_PREVIEW",
      majorId,
      courseId,
      semester,
    })
  }, [courseId, itemId, itemType, majorId, semester, trackInteraction])

  return null
}
