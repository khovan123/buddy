import type { ReactNode } from "react"

import { cookies } from "next/headers"

import { Navigation } from "@/components/organisms/navigation"
import { SiteFooter } from "@/components/organisms/site-footer"
import { navActions, navItems } from "@/config/nav"

export default async function IntroLayout({
  children,
}: {
  children: ReactNode
}) {
  const cookieStore = await cookies()
  const hasAccessToken = !!cookieStore.get("accessToken")?.value

  const headerActions = hasAccessToken
    ? [{ href: "/home", label: "Go to Buddy", variant: "default" as const }]
    : navActions

  return (
    <div className="relative min-h-screen">
      {/* Shared navigation for all marketing / intro pages */}
      <header className="sticky top-0 z-50">
        <Navigation
          brandLabel="Buddy"
          items={navItems}
          actions={headerActions}
          actionsPosition="right"
          containerClassName="max-w-7xl"
        />
      </header>

      {children}

      <SiteFooter />
    </div>
  )
}
