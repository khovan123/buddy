"use server"

import { revalidatePath } from "next/cache"

import {
  type PlanLimits,
  type SubscriptionPlanCode,
  updateSubscriptionPlanLimits,
} from "../services/plan-limits.service"

export async function savePlanLimitsAction(
  code: SubscriptionPlanCode,
  limits: PlanLimits
) {
  const ok = await updateSubscriptionPlanLimits(code, limits)

  if (ok) {
    revalidatePath("/dashboard/plans")
    revalidatePath("/pricing")
  }

  return { ok }
}
