"use client"

import { useRouter } from "next/navigation"

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  useRecheckResourceModerationMutation,
  useRecheckTutorialModerationMutation,
} from "@/features/content/services/content-api"
import { cn } from "@/lib/utils"

interface ContentModerationStatusBadgeProps {
  status: string
  moderationStatus?: string
}

export function ContentModerationStatusBadge({
  status,
  moderationStatus,
}: ContentModerationStatusBadgeProps) {
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

interface ContentModerationChecklistProps {
  status: string
  moderationStatus?: string | null
  verified?: boolean
  reasons?: string[]
  compact?: boolean
}

function normalizeStatus(value?: string | null) {
  return value?.trim().toUpperCase() ?? ""
}

function getChecklistState({
  status,
  moderationStatus,
  verified,
}: Pick<
  ContentModerationChecklistProps,
  "status" | "moderationStatus" | "verified"
>) {
  const contentStatus = normalizeStatus(status)
  const moderation = normalizeStatus(moderationStatus)
  const rejected = contentStatus === "BANNED" || moderation === "REJECTED"
  const failed = contentStatus === "FAILED" || moderation === "ERROR"
  const approved =
    contentStatus === "AVAILABLE" ||
    moderation === "APPROVED" ||
    Boolean(verified)
  const reviewing = moderation === "NEEDS_REVIEW"
  const processing = contentStatus === "PROCESSING" || moderation === "PENDING"

  return [
    {
      label: "Upload completed",
      state:
        contentStatus === "PENDING"
          ? "pending"
          : failed
            ? "failed"
            : "complete",
    },
    {
      label: "Moderation queued",
      state: processing ? "active" : "complete",
    },
    {
      label: "Safety checklist",
      state: rejected || failed ? "failed" : approved ? "complete" : "active",
    },
    {
      label: "Ready to publish",
      state: approved
        ? "complete"
        : rejected || failed
          ? "failed"
          : reviewing
            ? "review"
            : "pending",
    },
  ] as const
}

function ChecklistIcon({
  state,
}: {
  state: "active" | "complete" | "failed" | "pending" | "review"
}) {
  if (state === "complete") {
    return <CheckCircle2 className="size-3.5 text-primary" />
  }
  if (state === "failed") {
    return <AlertTriangle className="size-3.5 text-destructive" />
  }
  if (state === "review") {
    return <AlertTriangle className="size-3.5 text-amber-600" />
  }
  if (state === "active") {
    return <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
  }
  return <Clock3 className="size-3.5 text-muted-foreground/70" />
}

export function ContentModerationChecklist({
  status,
  moderationStatus,
  verified,
  reasons,
  compact = false,
}: ContentModerationChecklistProps) {
  const items = getChecklistState({ status, moderationStatus, verified })

  return (
    <div
      className={cn(
        "rounded-md border border-border/60 bg-background/70",
        compact ? "mt-2 p-2" : "p-3"
      )}
    >
      <div
        className={cn(
          "grid gap-2",
          compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 md:grid-cols-2"
        )}
      >
        {items.map((item) => (
          <div
            key={item.label}
            className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground"
          >
            <ChecklistIcon state={item.state} />
            <span className="truncate">{item.label}</span>
          </div>
        ))}
      </div>
      {reasons?.length ? (
        <ul className="mt-2 space-y-1 border-t border-border/60 pt-2 text-xs text-destructive">
          {reasons.slice(0, 3).map((reason) => (
            <li key={reason} className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              <span className="line-clamp-2">{reason}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

interface ManualModerationCheckButtonProps {
  contentId: string
  contentType: "resource" | "tutorial"
}

export function ManualModerationCheckButton({
  contentId,
  contentType,
}: ManualModerationCheckButtonProps) {
  const router = useRouter()
  const [recheckResource, resourceState] = useRecheckResourceModerationMutation()
  const [recheckTutorial, tutorialState] = useRecheckTutorialModerationMutation()
  const isLoading = resourceState.isLoading || tutorialState.isLoading

  async function handleRecheck() {
    try {
      if (contentType === "resource") {
        await recheckResource({ resourceId: contentId }).unwrap()
      } else {
        await recheckTutorial({ tutorialId: contentId }).unwrap()
      }
      toast.success("Moderation check completed")
      router.refresh()
    } catch {
      toast.error("Moderation check failed")
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-fit"
      disabled={isLoading}
      onClick={handleRecheck}
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCw className="size-4" />
      )}
      Check moderation
    </Button>
  )
}
