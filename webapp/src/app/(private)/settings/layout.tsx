import type { ReactNode } from "react"

import type { Metadata } from "next"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { SettingsSidebar } from "@/features/billing/components/settings-sidebar"

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your billing, subscription, and account settings.",
  robots: { index: false, follow: false },
}

export default function SettingsLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="sidebar-contained overflow-hidden rounded-xl border">
      <SidebarProvider defaultOpen>
        <SettingsSidebar />
        <SidebarInset className="min-h-[60vh]">
          <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-8">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
