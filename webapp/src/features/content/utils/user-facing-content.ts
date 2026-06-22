import { extractApiError } from "@/types/api"

export function getFriendlyContentError(
  error: unknown,
  fallback = "Something did not work. Please try again."
) {
  const rawMessage = extractApiError(error)
  const message = rawMessage || fallback
  const normalized = message.toLowerCase()

  if (
    normalized.includes("upload-service") ||
    normalized.includes("presigned") ||
    normalized.includes("timeout") ||
    normalized.includes("service unavailable")
  ) {
    return "We could not get the upload ready in time. Please wait a moment, then try again."
  }

  if (
    normalized.includes("file") ||
    normalized.includes("mime") ||
    normalized.includes("too large") ||
    normalized.includes("unsupported")
  ) {
    return "This file cannot be uploaded. Please check the file type and size, or choose another file."
  }

  if (
    normalized.includes("billing") ||
    normalized.includes("subscription") ||
    normalized.includes("plan")
  ) {
    return "Your current plan may not include this action. Please check your plan before trying again."
  }

  if (
    normalized.includes("moderation") ||
    normalized.includes("gemini") ||
    normalized.includes("fetch failed") ||
    normalized.includes("429")
  ) {
    return "We could not finish checking this content right now. Please try again later."
  }

  if (
    normalized.includes("validation") ||
    normalized.includes("bad request") ||
    normalized.includes("400")
  ) {
    return "Some information is missing or does not look right. Please review the form and try again."
  }

  return message
}

export function getFriendlyModerationReason(reason: string) {
  const normalized = reason.trim().toLowerCase()

  if (!normalized) {
    return ""
  }

  if (
    normalized === "fetch failed" ||
    normalized.includes("network") ||
    normalized.includes("timeout")
  ) {
    return "We could not check this content right now. Please try again."
  }

  if (normalized.includes("429") || normalized.includes("rate limit")) {
    return "Many people are checking content right now. Please wait a little and try again."
  }

  if (
    normalized.includes("unreadable") ||
    normalized.includes("extract") ||
    normalized.includes("empty content")
  ) {
    return "We could not read enough text from this file. Please try another .txt, .docx, or .md file."
  }

  if (
    normalized.includes("rejected") ||
    normalized.includes("violation") ||
    normalized.includes("safety")
  ) {
    return "This content may not be suitable to share yet. Please review the file before making it available."
  }

  return reason
}
