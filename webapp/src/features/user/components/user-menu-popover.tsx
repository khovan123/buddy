"use client"

import { useState } from "react"

import Link from "next/link"

import { signOut } from "next-auth/react"

import { LogOut, Pencil, Settings, User } from "lucide-react"

import { UserAvatar } from "@/components/atoms/user-avatar"
import { ConfirmDialog } from "@/components/molecules/confirm-dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { clearAuthCookies } from "@/features/auth/actions"
import type { UserProfile } from "@/features/user/services/user-api"

/* ── Types ──────────────────────────────────────────────────── */

interface UserMenuPopoverProps {
  user: UserProfile | null
  onEditProfile?: () => void
}

/* ── Menu item ──────────────────────────────────────────────── */

function MenuItem({
  icon: Icon,
  label,
  href,
  onClick,
  variant = "default",
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href?: string
  onClick?: () => void
  variant?: "default" | "destructive"
}) {
  const classes = `flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors outline-none ${
    variant === "destructive"
      ? "text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10"
      : "text-foreground hover:bg-accent focus-visible:bg-accent"
  }`

  if (href) {
    return (
      <Link href={href} className={classes}>
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        {label}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      <Icon
        className={`size-4 shrink-0 ${variant === "destructive" ? "text-destructive/70" : "text-muted-foreground"}`}
      />
      {label}
    </button>
  )
}

/* ── Component ──────────────────────────────────────────────── */

export function UserMenuPopover({ user, onEditProfile }: UserMenuPopoverProps) {
  const nickname = user?.profile?.nickname ?? user?.nickname ?? "Buddy"
  const email = user?.email ?? ""
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="rounded-full ring-offset-background transition-opacity outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="User menu"
            id="user-menu-trigger"
          >
            <UserAvatar
              className="size-8 border border-border"
              name={nickname}
              src={user?.profile?.avatarUrl}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-64 gap-0 p-2"
          id="user-menu-popover"
        >
          {/* ── User info header ────────────────────────── */}
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-foreground">
              {nickname}
            </p>
            {email && (
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            )}
          </div>

          <Separator className="my-1" />

          {/* ── Menu items ──────────────────────────────── */}
          <nav className="flex flex-col" aria-label="User menu">
            <MenuItem icon={User} label="My Profile" href="/profile" />
            <MenuItem
              icon={Pencil}
              label="Edit Profile"
              onClick={onEditProfile}
            />
            <MenuItem icon={Settings} label="Settings" href="/settings" />
          </nav>

          <Separator className="my-1" />

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-destructive transition-colors outline-none hover:bg-destructive/10 focus-visible:bg-destructive/10"
            onClick={() => {
              setPopoverOpen(false)
              setLogoutOpen(true)
            }}
          >
            <LogOut className="size-4 shrink-0 text-destructive/70" />
            Sign Out
          </button>
        </PopoverContent>
      </Popover>
      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        variant="warning"
        title="Sign out?"
        description="You will need to log in again before managing your content, billing, and account settings."
        confirmLabel="Sign out"
        onConfirm={async () => {
          await clearAuthCookies()
          signOut({ callbackUrl: "/" })
        }}
      />
    </>
  )
}
