import { getClientAuthHeaders } from "@/lib/client-session"

import type { InteractionStats } from "./interaction-api"

export const INTERACTION_STATS_EVENT = "buddy:interaction-stats"

let source: EventSource | null = null
let connectPromise: Promise<void> | null = null
let retryAfter = 0

function currentTime() {
  return new Date().getTime()
}

export function ensureInteractionStatsStream() {
  if (typeof globalThis.window === "undefined") {
    return
  }

  if (source && source.readyState !== EventSource.CLOSED) {
    return
  }

  if (connectPromise || currentTime() < retryAfter) {
    return
  }

  connectPromise = getClientAuthHeaders()
    .then((headers) => {
      if (!headers?.Authorization) {
        retryAfter = currentTime() + 30_000
        return
      }

      source = new globalThis.EventSource("/api/interactions/stream")
      source.addEventListener("interaction.stats", (event) => {
        const stats = JSON.parse((event as MessageEvent).data) as InteractionStats
        globalThis.dispatchEvent(
          new CustomEvent<InteractionStats>(INTERACTION_STATS_EVENT, {
            detail: stats,
          })
        )
      })

      source.onerror = () => {
        source?.close()
        source = null
        retryAfter = currentTime() + 30_000
      }
    })
    .finally(() => {
      connectPromise = null
    })
}
