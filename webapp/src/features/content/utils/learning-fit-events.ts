export type LearningFitEventName =
  | "fit_card_viewed"
  | "fit_cta_clicked"
  | "fit_editor_completed"
  | "start_here_clicked"

export function trackLearningFitEvent(
  event: LearningFitEventName,
  payload: Record<string, boolean | number | string | null | undefined>
) {
  if (typeof globalThis.window === "undefined") {
    return
  }

  const detail = { event, payload }
  globalThis.window.dispatchEvent(
    new CustomEvent("buddy:analytics", { detail })
  )
}
