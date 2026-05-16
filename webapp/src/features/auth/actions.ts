"use server"

import { cookies } from "next/headers"

/**
 * Clears custom authentication cookies.
 * Must be called prior to NextAuth's signOut() to ensure full logout.
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies()
  cookieStore.delete("accessToken")
  cookieStore.delete("refreshToken")
}
