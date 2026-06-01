import type { ReactNode } from "react"

import type { Metadata } from "next"

import { SiteFooter } from "@/components/organisms/site-footer"
import { PrivateHeader } from "@/features/user/components/private-header-client"
import { getMe } from "@/features/user/services/user.service"
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50">
        <PrivateHeader
          user={user}
          accountFallback={session?.user ?? null}
          accessToken={accessToken}
        />
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-10 px-4 py-8 sm:px-6 md:py-10">
        {children}
      </main>

      <SiteFooter />
    </div>
  )
}
