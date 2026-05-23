import type { ReactNode } from "react"

import type { Metadata } from "next"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { SettingsSidebar } from "@/features/settings"

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Manage your profile, security, notifications, billing, and subscription settings.",
  robots: { index: false, follow: false },
}

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="sidebar-contained overflow-hidden rounded-xl border bg-background shadow-sm">
      <SidebarProvider defaultOpen>
        <SettingsSidebar />
        <SidebarInset className="min-h-[70vh] bg-background">
          <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
