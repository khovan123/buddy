import { redirect } from "next/navigation"

import { getSubscription } from "@/features/billing/services/billing.service"
import {
  type RoleAccessInput,
  buildRoleAccessInput,
  isAdminAccess,
  isCreatorAccess,
} from "@/lib/auth/role-access"
import { getAccessToken, getCachedSession } from "@/lib/server-session"

function resolveRealtimeSubscriptionPlan(subscription?: {
  plan?: string | null
  status?: string | null
} | null) {
  return subscription?.status === "ACTIVE" ? subscription.plan ?? null : null
}

export async function getServerRoleAccessInput(): Promise<RoleAccessInput> {
  const [session, accessToken, subscription] = await Promise.all([
    getCachedSession(),
    getAccessToken(),
    getSubscription(),
  ])

  const roleAccess = buildRoleAccessInput(session?.user, accessToken)
  const realtimeSubscriptionPlan = resolveRealtimeSubscriptionPlan(subscription)

  return {
    ...roleAccess,
    subscriptionPlan: realtimeSubscriptionPlan ?? roleAccess.subscriptionPlan,
  }
}

export async function requireAdminAccess() {
  if (!isAdminAccess(await getServerRoleAccessInput())) {
    redirect("/home")
  }
}

export async function requireCreatorAccess() {
  if (!isCreatorAccess(await getServerRoleAccessInput())) {
    redirect("/home")
  }
}
