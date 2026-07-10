"use client"

import { useMemo, useState } from "react"

import { useSession } from "next-auth/react"

import type { NavigationItem } from "@/components/atoms/nav-dropdown-item"
import { AuthNavigationActions } from "@/components/molecules/auth-navigation-actions"
import { CreateContentCTA } from "@/components/molecules/create-content-cta"
import { LanguageSwitcher } from "@/components/molecules/language-switcher"
import { Navigation } from "@/components/organisms/navigation"
import { HeaderWalletPopover } from "@/features/user/components/header-wallet-popover"
import { Notifications } from "@/features/user/components/notifications"
import { PlanSelectorDialog } from "@/features/user/components/plan-selector-dialog"
import { ProfileCompleteBanner } from "@/features/user/components/profile-complete-banner"
import { ProfileUpdateDialog } from "@/features/user/components/profile-update-dialog"
import { UserMenuPopover } from "@/features/user/components/user-menu-popover"
import type { UserProfile } from "@/features/user/services/user-api"
import { useI18n } from "@/i18n/language-provider"
import { isAdminAccess, isCreatorAccess } from "@/lib/auth/role-access"

/* ── Navigation items (same as previously in the server layout) ── */

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
export function PrivateHeader({ user, accountFallback }: PrivateHeaderProps) {
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const { t } = useI18n()
  const { status: sessionStatus } = useSession()
  const isSessionInvalid = sessionStatus === "unauthenticated"

  const openProfileDialog = () => setProfileDialogOpen(true)
  const isAdmin = isAdminAccess(accountFallback)
  const isCreator = isCreatorAccess(accountFallback)
  const navigationItems = useMemo(() => {
    const baseNavItems: NavigationItem[] = [
      { href: "/home", label: t("nav.home") },
      {
        label: t("nav.explore"),
        dropdown: [
          {
            href: "/explore/resources",
            label: t("nav.resource"),
            description: t("nav.resourceDescription"),
            iconKey: "BookOpen",
          },
          {
            href: "/explore/tutorials",
            label: t("nav.tutorial"),
            description: t("nav.tutorialDescription"),
            iconKey: "GraduationCap",
          },
        ],
      },
      { href: "/forum", label: t("nav.forum") },
      { href: "/library", label: t("nav.library") },
      { href: "/profile", label: t("nav.profile") },
    ]

    if (isAdmin) {
      return [{ href: "/dashboard", label: t("nav.dashboard") }]
    }

    return isCreator
      ? [...baseNavItems, { href: "/content", label: t("nav.content") }]
      : baseNavItems
  }, [isAdmin, isCreator, t])
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
      {!isSessionInvalid ? (
        <ProfileCompleteBanner user={user} onUpdateClick={openProfileDialog} />
      ) : null}

      <Navigation
        brandLabel="Buddy"
        items={navigationItems}
        containerClassName="max-w-7xl"
        rightSlot={
          <>
            {!isSessionInvalid && !isAdmin && isCreator ? (
              <CreateContentCTA />
            ) : null}
            {!isSessionInvalid && !isAdmin ? <PlanSelectorDialog /> : null}
            {!isSessionInvalid && !isAdmin ? <HeaderWalletPopover /> : null}
            <LanguageSwitcher compact />
            {!isSessionInvalid ? <Notifications /> : null}
            {isSessionInvalid ? (
              <AuthNavigationActions />
            ) : (
              <UserMenuPopover
                user={menuUser}
                onEditProfile={openProfileDialog}
              />
            )}
          </>
        }
      />

      {/* Profile update dialog – rendered once, shared across triggers */}
      {!isSessionInvalid ? (
        <ProfileUpdateDialog
          user={user}
          open={profileDialogOpen}
          onOpenChange={setProfileDialogOpen}
        />
      ) : null}
    </>
  )
}
