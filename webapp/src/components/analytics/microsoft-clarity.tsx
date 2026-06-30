"use client"

import { useEffect } from "react"

import Clarity from "@microsoft/clarity"

const CLARITY_PROJECT_ID =
  process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? "xexoyzmw6k"

export function MicrosoftClarity() {
  useEffect(() => {
    if (!CLARITY_PROJECT_ID) {
      return
    }

    Clarity.init(CLARITY_PROJECT_ID)
  }, [])

  return null
}
