import { isDynamicServerError } from "next/dist/client/components/hooks-server-context"

import { fetchApi } from "@/lib/fetch"
import { getAuthHeaders } from "@/lib/server-session"
import type { ApiResponse } from "@/types/api"

export type AuthVerification = {
  id: string
  status: string
  emailVerified: boolean
}

export function isAuthVerified(auth?: AuthVerification | null): boolean {
  return auth?.emailVerified === true && auth.status === "active"
}

export async function getAuthMe(): Promise<AuthVerification | null> {
  try {
    const res = await fetchApi(
      "GET",
      "/auth/me",
      undefined,
      await getAuthHeaders(),
      false,
      { cache: "no-store" }
    )

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<AuthVerification>
    return json.data ?? null
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch auth profile:", error)
    return null
  }
}

export async function getAuthVerification(
  userId: string
): Promise<AuthVerification | null> {
  try {
    const res = await fetchApi(
      "GET",
      `/auth/users/${userId}/verification`,
      undefined,
      await getAuthHeaders(),
      false,
      { cache: "no-store" }
    )

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<AuthVerification>
    return json.data ?? null
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error(`Failed to fetch auth verification for ${userId}:`, error)
    return null
  }
}
