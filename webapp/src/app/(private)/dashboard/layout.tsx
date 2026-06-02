import React from "react"

import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DashboardBreadcrumb } from "@/features/dashboard"
import { DashboardSidebar } from "@/features/dashboard"
import { requireAdminAccess } from "@/lib/auth/server-role-access"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminAccess()

  return (
    <div className="sidebar-contained overflow-hidden rounded-xl border">
      <SidebarProvider defaultOpen>
        <DashboardSidebar />
        <SidebarInset className="min-h-[60vh]">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4!" />
            <DashboardBreadcrumb />
          </header>
          <div className="p-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
