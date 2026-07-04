"use server"

import { revalidatePath } from "next/cache"

import {
  type PlanSettings,
  type SubscriptionPlanCode,
  updateSubscriptionPlanLimits,
} from "../services/plan-limits.service"

export async function savePlanLimitsAction(
  code: SubscriptionPlanCode,
  settings: PlanSettings
) {
  const ok = await updateSubscriptionPlanLimits(code, settings)

  if (ok) {
    revalidatePath("/dashboard/plans")
    revalidatePath("/pricing")
  }

  return { ok }
}
