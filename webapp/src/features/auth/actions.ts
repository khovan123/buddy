"use server"

import { cookies } from "next/headers"

/**
 * Clears custom authentication cookies and session details.
 * Must be called prior to NextAuth's signOut() to ensure full logout.
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies()
  cookieStore.delete("accessToken")
  cookieStore.delete("refreshToken")
  cookieStore.delete("role")
  cookieStore.delete("next-auth.session-token")
  cookieStore.delete("__Secure-next-auth.session-token")
}
