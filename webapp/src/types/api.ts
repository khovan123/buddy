// ─────────────────────────────────────────────────────────────
// Shared API Types — matches backend response envelope
// ─────────────────────────────────────────────────────────────

/** Successful response envelope from backend `successResponse()` */
export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  message: string
  correlationId?: string
  timestamp?: string
}

/** Error response envelope from backend `GlobalExceptionFilter` */
export interface ApiError {
  statusCode: number
  error: string
  message: string | string[]
  correlationId?: string
  timestamp: string
  path: string
}

/** Union type — raw JSON from any backend response */
export type ApiResult<T = unknown> = ApiResponse<T> | ApiError

// ── Guard ────────────────────────────────────────────────────

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "statusCode" in value &&
    "error" in value
  )
}

export function isApiSuccess<T>(value: unknown): value is ApiResponse<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    (value as ApiResponse).success === true
  )
}

// ── Helpers ──────────────────────────────────────────────────

/** Extract human-readable error message from any API error shape */
export function extractApiError(error: unknown): string {
  // RTK Query rejected value: { data: ApiError }
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data: unknown }).data

    if (isApiError(data)) {
      return Array.isArray(data.message) ? data.message[0] : data.message
    }

    // Fallback: { data: { message: string } }
    if (typeof data === "object" && data !== null && "message" in data) {
      const msg = (data as { message: unknown }).message
      if (typeof msg === "string") {
        return msg
      }
      if (Array.isArray(msg) && typeof msg[0] === "string") {
        return msg[0]
      }
    }
  }

  // Direct ApiError
  if (isApiError(error)) {
    return Array.isArray(error.message) ? error.message[0] : error.message
  }

  // Generic Error
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === "string") {
    return error
  }

  if (typeof error === "object" && error !== null) {
    if ("message" in error) {
      const message = (error as { message: unknown }).message
      if (typeof message === "string") {
        return message
      }
      if (Array.isArray(message) && typeof message[0] === "string") {
        return message[0]
      }
    }

    try {
      return JSON.stringify(error)
    } catch {
      return "An unexpected error occurred"
    }
  }

  return error?.toString() ?? "An unexpected error occurred"
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedResult<T> {
  data: T[]
  meta: PaginationMeta
}
