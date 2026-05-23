"use client"

import { useState } from "react"

import { Bell } from "lucide-react"

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

const NAV_ITEMS = [
  { href: "/home", label: "Home" },
  { href: "/explore", label: "Explore" },
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
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)

  const openProfileDialog = () => setProfileDialogOpen(true)

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
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              className="relative hidden md:inline-flex"
            >
              <Bell className="size-4" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-primary" />
            </Button>
            <UserMenuPopover user={user} onEditProfile={openProfileDialog} />
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
