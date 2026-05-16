import { isDynamicServerError } from "next/dist/client/components/hooks-server-context"

import { fetchApi } from "@/lib/fetch"
import { getAuthHeaders } from "@/lib/server-session"
import { ApiResponse } from "@/types/api"

import { UserProfile } from "./user-api"

export const getMe = async (): Promise<UserProfile | null> => {
  try {
    const headers = await getAuthHeaders()
    const res = await fetchApi("GET", `/users/me`, undefined, headers, false, {
      next: { revalidate: 60, tags: ["profile-me"] },
    })

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<UserProfile>
    return json.data ?? null
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error(`Failed to fetch profile:`, error)
    return null
  }
}

export interface CreatorStats {
  followers: number
  following: number
  avgRating: number
  ratingCount: number
  totalResources: number
  totalSales: number
}

const defaultStats: CreatorStats = {
  followers: 0,
  following: 0,
  avgRating: 0,
  ratingCount: 0,
  totalResources: 0,
  totalSales: 0,
}

export const getCreatorStats = async (
  userId: string
): Promise<CreatorStats> => {
  try {
    const headers = await getAuthHeaders()
    const res = await fetchApi(
      "GET",
      `/users/${userId}/creator-stats`,
      undefined,
      headers,
      false,
      { next: { revalidate: 60, tags: ["creator-stats"] } }
    )

    if (!res.ok) {
      return defaultStats
    }

    const json = (await res.json()) as ApiResponse<CreatorStats>
    return json.data ?? defaultStats
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error(`Failed to fetch creator stats:`, error)
    return defaultStats
  }
}

