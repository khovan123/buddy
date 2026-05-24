"use client"

import { useMemo, useState } from "react"

import { useSession } from "next-auth/react"

import { Bell } from "lucide-react"

import type { NavigationItem } from "@/components/atoms/nav-dropdown-item"
import { CreateContentCTA } from "@/components/molecules/create-content-cta"
import { Navigation } from "@/components/organisms/navigation"
import { Button } from "@/components/ui/button"
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
}

/**
 * Client-side header for the private layout.
 *
 * Receives the user profile from the server layout and passes it down.
 * Manages the shared `ProfileUpdateDialog` state so both
 * `ProfileCompleteBanner` and `UserMenuPopover` can trigger it.
 */
export function PrivateHeader({ user }: PrivateHeaderProps) {
  const { data: session } = useSession()
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)

  const openProfileDialog = () => setProfileDialogOpen(true)
  const headerUser = useMemo<UserProfile | null>(() => {
    if (user?.email && (user.profile?.nickname || user.nickname)) {
      return user
    }

    const sessionUser = session?.user
    if (!sessionUser?.id && !sessionUser?.email) {
      return user
    }

    const nickname =
      user?.profile?.nickname ||
      user?.nickname ||
      sessionUser.nickname ||
      sessionUser.email?.split("@")[0] ||
      "Buddy"

    return {
      id: user?.id ?? sessionUser.id ?? "",
      userId: user?.userId ?? sessionUser.id,
      email: user?.email ?? sessionUser.email ?? "",
      nickname,
      profile: {
        ...(user?.profile ?? { nickname }),
        nickname,
      },
      isActive: user?.isActive ?? true,
      createdAt: user?.createdAt ?? new Date().toISOString(),
      updatedAt: user?.updatedAt ?? new Date().toISOString(),
    }
  }, [session?.user, user])

  return (
    <>
      <ProfileCompleteBanner
        user={headerUser}
        onUpdateClick={openProfileDialog}
      />

      <Navigation
        brandLabel="Buddy"
        items={NAV_ITEMS}
        containerClassName="max-w-7xl"
        rightSlot={
          <>
            <CreateContentCTA />
            <PlanSelectorDialog />
            <HeaderWalletPopover />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              className="relative hidden md:inline-flex"
            >
              <Bell className="size-4" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-primary" />
            </Button>
            <UserMenuPopover
              user={headerUser}
              onEditProfile={openProfileDialog}
            />
          </>
        }
      />

      {/* Profile update dialog – rendered once, shared across triggers */}
      <ProfileUpdateDialog
        user={headerUser}
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
      />
    </>
  )
}
