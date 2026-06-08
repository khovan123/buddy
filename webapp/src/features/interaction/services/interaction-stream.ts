import type { InteractionStats } from "./interaction-api"

export const INTERACTION_STATS_EVENT = "buddy:interaction-stats"

let source: EventSource | null = null

export function ensureInteractionStatsStream() {
  if (typeof globalThis.window === "undefined") {
    return
  }

  if (source && source.readyState !== EventSource.CLOSED) {
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
  }
}
