// Server session helpers — only usable in server components / route handlers.
// cookies() will throw at runtime if called from client context.

import { cookies } from "next/headers"

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
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
