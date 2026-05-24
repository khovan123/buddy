"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Bell,
  CreditCard,
  Receipt,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const SETTINGS_NAV = [
  {
    label: "Account",
    items: [
      {
        title: "Profile",
        href: "/settings/profile",
        icon: UserRound,
      },
      {
        title: "Security",
        href: "/settings/security",
        icon: ShieldCheck,
      },
      {
        title: "Notifications",
        href: "/settings/notifications",
        icon: Bell,
      },
    ],
  },
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
] as const

function isItemActive(pathname: string, href: string) {
  if (href === "/settings/billing") {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SettingsSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar
      collapsible="icon"
      className="h-full! border-r border-border/50 bg-card/50 shadow-sm backdrop-blur-xl"
    >
      <SidebarContent className="py-3">
        {SETTINGS_NAV.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isItemActive(pathname, item.href)}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
