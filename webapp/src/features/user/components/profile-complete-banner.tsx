"use client"

import { AlertTriangle } from "lucide-react"

import type { UserProfile } from "@/features/user/services/user-api"
import { getMissingProfileFields } from "@/features/user/utils/profile-completion"

/**
 * Persistent banner that checks profile completeness.
 * Shows if career, major, or skills are missing.
 * Cannot be dismissed — only disappears when profile is updated.
 */

interface ProfileCompleteBannerProps {
  user: UserProfile | null
  onUpdateClick?: () => void
}

export function ProfileCompleteBanner({
  user,
  onUpdateClick,
}: ProfileCompleteBannerProps) {
  const missing = getMissingProfileFields(user)

  if (missing.length === 0) {
    return null
  }

  return (
    <div className="border-b border-warning/20 bg-muted px-6 py-3">
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <AlertTriangle className="size-4 shrink-0 text-destructive" />
        <p className="flex-1 text-sm text-foreground">
          <strong>Profile incomplete</strong> — Please update your{" "}
          {missing.map((field) => field.label).join(", ")} to get personalized
          recommendations.
        </p>
        <button
          type="button"
          onClick={onUpdateClick}
          className="shrink-0 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:opacity-90"
        >
          Update Profile
        </button>
      </div>
    </div>
  )
}
