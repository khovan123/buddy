"use client"

import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"

interface ModerationStatusBadgeProps {
  status: string
  moderationStatus?: string
}

export function ModerationStatusBadge({
  status,
  moderationStatus,
}: ModerationStatusBadgeProps) {
  if (status === "BANNED" || moderationStatus === "REJECTED") {
    return (
      <Badge variant="destructive" className="uppercase">
        <ShieldAlert className="size-3" />
        Rejected
      </Badge>
    )
  }

  if (status === "FAILED" || moderationStatus === "ERROR") {
    return (
      <Badge variant="destructive" className="uppercase">
        <AlertTriangle className="size-3" />
        Failed
      </Badge>
    )
  }

  if (moderationStatus === "NEEDS_REVIEW") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/30 bg-amber-500/10 text-amber-700 uppercase dark:text-amber-300"
      >
        <AlertTriangle className="size-3" />
        Review
      </Badge>
    )
  }

  if (status === "PROCESSING" || moderationStatus === "PENDING") {
    return (
      <Badge variant="secondary" className="uppercase">
        <Clock3 className="size-3" />
        Processing
      </Badge>
    )
  }

  if (status === "AVAILABLE" || moderationStatus === "APPROVED") {
    return (
      <Badge variant="default" className="uppercase">
        <CheckCircle2 className="size-3" />
        Approved
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className="uppercase">
      {status}
    </Badge>
  )
}

export function ModerationReason({ reasons }: { reasons?: string[] }) {
  if (!reasons?.length) {
    return null
  }

  return (
    <p className="mt-2 line-clamp-2 text-xs text-destructive">
      Moderation reason: {reasons[0]}
    </p>
  )
}
