"use client"

import { LogOut } from "lucide-react"
import { signOut } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { clearAuthCookies } from "@/features/auth/actions"

export function DashboardLogoutButton() {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        await clearAuthCookies()
        signOut({ callbackUrl: "/" })
      }}
    >
      <LogOut className="size-4" />
      Logout
    </Button>
  )
}
