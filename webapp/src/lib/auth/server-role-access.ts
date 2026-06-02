import { redirect } from "next/navigation"

import { getSubscription } from "@/features/billing/services/billing.service"
import {
  buildRoleAccessInput,
  isAdminAccess,
  isCreatorAccess,
} from "@/lib/auth/role-access"
import { getAccessToken, getCachedSession } from "@/lib/server-session"

export async function requireAdminAccess() {
  const [session, accessToken] = await Promise.all([
    getCachedSession(),
    getAccessToken(),
  ])

  if (!isAdminAccess(buildRoleAccessInput(session?.user, accessToken))) {
    redirect("/home")
  }
}

export async function requireCreatorAccess() {
  const [session, accessToken, subscription] = await Promise.all([
    getCachedSession(),
    getAccessToken(),
    getSubscription(),
  ])

  const accessInput = buildRoleAccessInput(session?.user, accessToken)
  const currentAccessInput = {
    ...accessInput,
    subscriptionPlan: subscription?.plan ?? accessInput.subscriptionPlan,
  }

  if (!isCreatorAccess(currentAccessInput)) {
    redirect("/home")
  }
}
