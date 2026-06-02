import type { ReactNode } from "react"

import type { Metadata } from "next"

import { EducationUniverse } from "@/components/atoms/education-universe"
import { SiteFooter } from "@/components/organisms/site-footer"
import { RAGChatLauncher } from "@/features/rag"
import { PrivateHeader } from "@/features/user/components/private-header-client"
import { getMe } from "@/features/user/services/user.service"
import { buildRoleAccessInput } from "@/lib/auth/role-access"
import { getAccessToken, getCachedSession } from "@/lib/server-session"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      noarchive: true,
    },
  },
}

export default async function PrivateLayout({
  children,
}: {
  children: ReactNode
}) {
  const [user, session, accessToken] = await Promise.all([
    getMe(),
    getCachedSession(),
    getAccessToken(),
  ])
  const roleAccess = buildRoleAccessInput(session?.user, accessToken)

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-x-clip bg-background">
      <div className="pointer-events-none fixed inset-0 z-[-1] opacity-20">
        <EducationUniverse variant="ambient" />
      </div>
      <div className="learning-grid pointer-events-none fixed inset-0 z-[-1] opacity-45" />
      <header className="sticky top-0 z-50">
        <PrivateHeader
          user={user}
          accountFallback={
            session?.user
              ? {
                  ...session.user,
                  ...roleAccess,
                }
              : roleAccess
          }
        />
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-10 px-4 py-8 sm:px-6 md:py-10">
        {children}
      </main>

      <SiteFooter />
      <RAGChatLauncher user={user} accessToken={accessToken} />
    </div>
  )
}
