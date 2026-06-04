"use client"

import { useMemo, useState } from "react"

import type { NavigationItem } from "@/components/atoms/nav-dropdown-item"
import { CreateContentCTA } from "@/components/molecules/create-content-cta"
import { Navigation } from "@/components/organisms/navigation"
import { useGetSubscriptionQuery } from "@/features/billing/services/billing-api"
import { HeaderWalletPopover } from "@/features/user/components/header-wallet-popover"
import { Notifications } from "@/features/user/components/notifications"
import { PlanSelectorDialog } from "@/features/user/components/plan-selector-dialog"
import { ProfileCompleteBanner } from "@/features/user/components/profile-complete-banner"
import { ProfileUpdateDialog } from "@/features/user/components/profile-update-dialog"
import { UserMenuPopover } from "@/features/user/components/user-menu-popover"
import type { UserProfile } from "@/features/user/services/user-api"
import { isAdminAccess, isCreatorAccess } from "@/lib/auth/role-access"

/* ── Navigation items (same as previously in the server layout) ── */

const BASE_NAV_ITEMS: NavigationItem[] = [
  { href: "/home", label: "Home" },
  {
    label: "Explore",
    dropdown: [
      {
        href: "/explore/resources",
        label: "Resource",
        description: "Browse study materials, notes, and documents",
        iconKey: "BookOpen",
      },
      {
        href: "/explore/tutorials",
        label: "Tutorial",
        description: "Browse guided videos and learning sessions",
        iconKey: "GraduationCap",
      },
    ],
  },
  { href: "/library", label: "Library" },
  { href: "/profile", label: "Profile" },
]

interface PrivateHeaderProps {
  user: UserProfile | null
  accountFallback?: {
    id?: string
    email?: string
    nickname?: string
    role?: string | null
    roles?: string[] | null
    subscriptionPlan?: string | null
  } | null
}

/**
 * Client-side header for the private layout.
 *
 * Receives the user profile from the server layout and passes it down.
 * Manages the shared `ProfileUpdateDialog` state so both
 * `ProfileCompleteBanner` and `UserMenuPopover` can trigger it.
 */
export function PrivateHeader({
  user,
  accountFallback,
}: PrivateHeaderProps) {
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const { data: subscriptionData } = useGetSubscriptionQuery()

  const openProfileDialog = () => setProfileDialogOpen(true)
  const isAdmin = isAdminAccess(accountFallback)
  const isCreator = isCreatorAccess({
    ...accountFallback,
    subscriptionPlan:
      subscriptionData?.data?.plan ?? accountFallback?.subscriptionPlan,
  })
  const navigationItems = useMemo(
    () =>
      isAdmin
        ? [{ href: "/dashboard", label: "Dashboard" }]
        : BASE_NAV_ITEMS,
    [isAdmin]
  )
  const menuUser = useMemo<UserProfile | null>(() => {
    if (user?.email && (user.profile?.nickname || user.nickname)) {
      return user
    }

    if (!accountFallback?.id && !accountFallback?.email) {
      return user
    }

    const nickname =
      user?.profile?.nickname ||
      user?.nickname ||
      accountFallback.nickname ||
      accountFallback.email?.split("@")[0] ||
      "Buddy"

    return {
      id: user?.id ?? accountFallback.id ?? "",
      userId: user?.userId ?? accountFallback.id,
      email: user?.email ?? accountFallback.email ?? "",
      nickname,
      profile: {
        ...(user?.profile ?? { nickname }),
        nickname,
      },
      isActive: user?.isActive ?? true,
      createdAt: user?.createdAt ?? "",
      updatedAt: user?.updatedAt ?? "",
    }
  }, [accountFallback, user])

  return (
    <>
      <ProfileCompleteBanner user={user} onUpdateClick={openProfileDialog} />

      <Navigation
        brandLabel="Buddy"
        items={navigationItems}
        containerClassName="max-w-7xl"
        rightSlot={
          <>
            {!isAdmin && isCreator ? <CreateContentCTA /> : null}
            {!isAdmin ? <PlanSelectorDialog /> : null}
            {!isAdmin ? <HeaderWalletPopover /> : null}
            <Notifications />
            <UserMenuPopover
              user={menuUser}
              onEditProfile={openProfileDialog}
            />
          </>
        }
      />

      {/* Profile update dialog – rendered once, shared across triggers */}
      <ProfileUpdateDialog
        user={user}
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
      />
    </>
  )
}
