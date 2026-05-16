"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  CreditCard,
  Receipt,
  Wallet
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar"

const SETTINGS_NAV = [
  {
    label: "Billing",
    items: [
      {
        title: "Overview",
        href: "/settings/billing",
        icon: Wallet,
      },
      {
        title: "Transactions",
        href: "/settings/billing/transactions",
        icon: Receipt,
      },
      {
        title: "Payout Account",
        href: "/settings/billing/payout",
        icon: CreditCard,
      },
    ],
  },
  // Extensible: add more groups here
  // {
  //   label: "Account",
  //   items: [
  //     { title: "Profile", href: "/settings/profile", icon: User },
  //     { title: "Notifications", href: "/settings/notifications", icon: Bell },
  //   ],
  // },
] as const

export function SettingsSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar
      collapsible="icon"
      className="h-full! border-r border-border/40 bg-card/40 shadow-sm backdrop-blur-2xl"
    >
      {/* <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Settings className="size-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Settings
          </span>
        </div>
      </SidebarHeader> */}

      <SidebarContent>
        {SETTINGS_NAV.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel >
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                      >
                        <Link href={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
