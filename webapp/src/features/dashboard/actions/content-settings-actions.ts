"use server"

import { revalidatePath } from "next/cache"

import { updateModerationSettings } from "../services/content-settings.service"

export async function saveModerationSettingsAction(enabled: boolean) {
  const settings = await updateModerationSettings(enabled)

  if (settings) {
    revalidatePath("/dashboard/moderation")
  }

  return { ok: Boolean(settings), settings }
}
