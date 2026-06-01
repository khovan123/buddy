"use client"

import { useMemo, useState } from "react"

import type { NavigationItem } from "@/components/atoms/nav-dropdown-item"
import { CreateContentCTA } from "@/components/molecules/create-content-cta"
import { Navigation } from "@/components/organisms/navigation"
import { RAGChatLauncher } from "@/features/rag"
import { ContentModerationNotifications } from "@/features/user/components/content-moderation-notifications"
import { HeaderWalletPopover } from "@/features/user/components/header-wallet-popover"
import { PlanSelectorDialog } from "@/features/user/components/plan-selector-dialog"
import { ProfileCompleteBanner } from "@/features/user/components/profile-complete-banner"
import { ProfileUpdateDialog } from "@/features/user/components/profile-update-dialog"
import { UserMenuPopover } from "@/features/user/components/user-menu-popover"
import type { UserProfile } from "@/features/user/services/user-api"

/* ── Navigation items (same as previously in the server layout) ── */

const NAV_ITEMS: NavigationItem[] = [
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
  { href: "/dashboard", label: "Dashboard" },
]

interface PrivateHeaderProps {
  user: UserProfile | null
  accountFallback?: {
    id?: string
    email?: string
    nickname?: string
  } | null
  accessToken?: string | null
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
  accessToken,
}: PrivateHeaderProps) {
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)

  const openProfileDialog = () => setProfileDialogOpen(true)
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
        items={NAV_ITEMS}
        containerClassName="max-w-7xl"
        rightSlot={
          <>
            <CreateContentCTA />
            <PlanSelectorDialog />
            <HeaderWalletPopover />
            <ContentModerationNotifications />
            <RAGChatLauncher user={menuUser} accessToken={accessToken} />
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
