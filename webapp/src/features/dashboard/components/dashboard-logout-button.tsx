"use client"

import { signOut } from "next-auth/react"

import { LogOut } from "lucide-react"

import { ConfirmDialog } from "@/components/molecules/confirm-dialog"
import { Button } from "@/components/ui/button"
import { clearAuthCookies } from "@/features/auth/actions"

export function DashboardLogoutButton() {
  return (
    <ConfirmDialog
      variant="warning"
      title="Log out of dashboard?"
      description="You will leave the dashboard and need to log in again to continue."
      confirmLabel="Log out"
      onConfirm={async () => {
        await clearAuthCookies()
        signOut({ callbackUrl: "/" })
      }}
      trigger={
        <Button size="sm" variant="outline">
          <LogOut className="size-4" />
          Logout
        </Button>
      }
    />
  )
}
