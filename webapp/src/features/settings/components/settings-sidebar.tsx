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
import { useI18n } from "@/i18n/language-provider"

function isItemActive(pathname: string, href: string) {
  if (href === "/settings/billing") {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SettingsSidebar() {
  const pathname = usePathname()
  const { t } = useI18n()

  const settingsNav = [
    {
      label: t("settings.account"),
      items: [
        {
          title: t("settings.profile"),
          href: "/settings/profile",
          icon: UserRound,
        },
        {
          title: t("settings.security"),
          href: "/settings/security",
          icon: ShieldCheck,
        },
        {
          title: t("settings.notifications"),
          href: "/settings/notifications",
          icon: Bell,
        },
      ],
    },
    {
      label: t("settings.billing"),
      items: [
        {
          title: t("settings.overview"),
          href: "/settings/billing",
          icon: Wallet,
        },
        {
          title: t("settings.transactions"),
          href: "/settings/billing/transactions",
          icon: Receipt,
        },
        {
          title: t("settings.payoutAccount"),
          href: "/settings/billing/payout",
          icon: CreditCard,
        },
      ],
    },
  ] as const

  return (
    <Sidebar
      collapsible="icon"
      className="h-full! border-r border-border/50 bg-card/50 shadow-sm backdrop-blur-xl"
    >
      <SidebarContent className="py-3">
        {settingsNav.map((group) => (
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
