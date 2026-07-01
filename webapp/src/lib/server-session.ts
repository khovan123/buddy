// Server session helpers — only usable in server components / route handlers.
// cookies() will throw at runtime if called from client context.

import { cache } from "react"

import { isDynamicServerError } from "next/dist/client/components/hooks-server-context"
import { cookies } from "next/headers"

import { getServerSession } from "next-auth"

import { authOptions } from "@/app/api/auth/[...nextauth]/route"

/**
 * Per-request memoised session lookup.
 *
 * React `cache()` deduplicates calls within the same server request,
 * so multiple server components / service helpers that need the session
 * (e.g. layout.tsx + getMe()) only decode it once.
 */
export const getCachedSession = cache(async () => {
  try {
    return await getServerSession(authOptions)
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }

    console.error("Failed to resolve server session:", error)
    return null
  }
})

/**
 * Server-only session helper.
 *
 * Reads the `accessToken` cookie set by NextAuth and returns it.
 * Returns `null` for unauthenticated visitors.
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get("accessToken")?.value ?? null
}

/**
 * Builds an `Authorization` header from the current session cookie.
 * Returns an empty object for unauthenticated visitors so services
 * can always spread it: `{ ...await getAuthHeaders() }`.
 *
 * Tries the cheap cookie read first; falls back to the cached session
 * so the token is resolved exactly once per request.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  // Fast path: cookie already available (avoids session decode entirely)
  const token = await getAccessToken()
  if (token) {
    return { Authorization: `Bearer ${token}` }
  }

  // Slow path: decode session (memoised per request)
  const session = await getCachedSession()
  if (session?.accessToken) {
    return { Authorization: `Bearer ${session.accessToken}` }
  }

  return {}
}
