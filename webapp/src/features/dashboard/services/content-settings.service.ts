import { fetchApi } from "@/lib/fetch"
import { getAuthHeaders } from "@/lib/server-session"
import { ApiResponse } from "@/types/api"

export type ModerationSettings = {
  enabled: boolean
  source: "runtime" | "env"
  updatedAt: string | null
  updatedBy: string | null
}

const DEFAULT_MODERATION_SETTINGS: ModerationSettings = {
  enabled: true,
  source: "env",
  updatedAt: null,
  updatedBy: null,
}

export async function getModerationSettings(): Promise<ModerationSettings> {
  try {
    const res = await fetchApi(
      "GET",
      "/content-settings/moderation",
      undefined,
      await getAuthHeaders(),
      true
    )

    if (!res.ok) {
      return DEFAULT_MODERATION_SETTINGS
    }

    const json = (await res.json()) as ApiResponse<ModerationSettings>
    return json.data ?? DEFAULT_MODERATION_SETTINGS
  } catch (error) {
    console.error("Failed to fetch moderation settings:", error)
    return DEFAULT_MODERATION_SETTINGS
  }
}

export async function updateModerationSettings(enabled: boolean) {
  try {
    const res = await fetchApi(
      "PATCH",
      "/content-settings/moderation",
      { enabled },
      await getAuthHeaders(),
      true
    )

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<ModerationSettings>
    return json.data ?? null
  } catch (error) {
    console.error("Failed to update moderation settings:", error)
    return null
  }
}
