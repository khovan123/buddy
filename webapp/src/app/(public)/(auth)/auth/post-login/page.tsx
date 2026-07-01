import { redirect } from "next/navigation"

import { getMe } from "@/features/user/services/user.service"
import { isProfileComplete } from "@/features/user/utils/profile-completion"
import { buildRoleAccessInput, isAdminAccess } from "@/lib/auth/role-access"
import { getAccessToken, getCachedSession } from "@/lib/server-session"

type PageSearchParams = Promise<{
  callbackUrl?: string | string[]
  allowOnboarding?: string | string[]
}>

function resolveBooleanParam(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value
  return raw === "1"
}

function resolveCallbackUrl(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value

  if (!raw) {
    return "/home"
  }

  try {
    const parsed = new URL(
      raw,
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://platform-buddy.vercel.app"
    )
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/home"
  } catch {
    return raw.startsWith("/") ? raw : "/home"
  }
}

export default async function PostLoginPage({
  searchParams,
}: {
  searchParams: PageSearchParams
}) {
  const [{ callbackUrl, allowOnboarding }, session, accessToken, user] =
    await Promise.all([
      searchParams,
      getCachedSession(),
      getAccessToken(),
      getMe(),
    ])

  if (!session?.user) {
    redirect("/login")
  }

  const roleAccess = buildRoleAccessInput(session.user, accessToken)

  if (isAdminAccess(roleAccess)) {
    redirect("/dashboard")
  }

  if (resolveBooleanParam(allowOnboarding) && !isProfileComplete(user)) {
    redirect("/onboarding")
  }

  redirect(resolveCallbackUrl(callbackUrl))
}
