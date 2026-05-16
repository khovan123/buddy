import React from "react"

import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DashboardBreadcrumb } from "@/features/dashboard/components/dashboard-breadcrumb"
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
