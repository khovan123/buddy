import { redirect } from "next/navigation"

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
  const [session, accessToken] = await Promise.all([
    getCachedSession(),
    getAccessToken(),
  ])

  if (!isCreatorAccess(buildRoleAccessInput(session?.user, accessToken))) {
    redirect("/home")
  }
}
