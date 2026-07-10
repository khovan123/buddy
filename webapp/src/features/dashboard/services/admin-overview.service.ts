import { isDynamicServerError } from "next/dist/client/components/hooks-server-context"

import { fetchApi } from "@/lib/fetch"
import { getAuthHeaders } from "@/lib/server-session"
import type { ApiResponse } from "@/types/api"

export type AdminOverview = {
  users: { total: number; creators: number; students: number }
  posts: { total: number; resources: number; tutorials: number }
  billing: {
    moneyInCents: string
    moneyOutCents: string
    billingRevenueCents: string
    creatorLeaderboard: Array<{ userId: string; earningsCents: string }>
  }
}

export async function getAdminOverview(): Promise<AdminOverview | null> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetchApi(
      "GET",
      "/admin/overview",
      undefined,
      headers
    )
    if (!response.ok) {return null}

    return ((await response.json()) as ApiResponse<AdminOverview>).data ?? null
  } catch (error) {
    if (isDynamicServerError(error)) {throw error}
    console.error("Failed to fetch admin overview:", error)
    return null
  }
}
