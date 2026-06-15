"use client"

import { useState } from "react"

import { useRouter } from "next/navigation"

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/molecules/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  useDeleteResourceMutation,
  useDeleteTutorialMutation,
  useRecheckResourceModerationMutation,
  useRecheckTutorialModerationMutation,
} from "@/features/content/services/content-api"
import { cn } from "@/lib/utils"

import { getFriendlyModerationReason } from "../../utils/user-facing-content"

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
        Needs changes
      </Badge>
    )
  }

  if (status === "FAILED" || moderationStatus === "ERROR") {
    return (
      <Badge variant="destructive" className="uppercase">
        <AlertTriangle className="size-3" />
        Try again
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
        Checking
      </Badge>
    )
  }

  if (status === "AVAILABLE" || moderationStatus === "APPROVED") {
    return (
      <Badge variant="default" className="uppercase">
        <CheckCircle2 className="size-3" />
        Ready
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
  ruleVersion?: string | null
  compact?: boolean
}

function normalizeStatus(value?: string | null) {
  return value?.trim().toUpperCase() ?? ""
}

function isPlaceholderModerationReason(reason: string) {
  const normalized = reason.trim().toLowerCase()
  return (
    normalized === "no moderation reason returned" ||
    normalized === "violation rules"
  )
}

function getModerationSummary({
  status,
  moderationStatus,
}: Pick<ContentModerationChecklistProps, "status" | "moderationStatus">) {
  const contentStatus = normalizeStatus(status)
  const moderation = normalizeStatus(moderationStatus)

  if (contentStatus === "FAILED" || moderation === "ERROR") {
    return {
      title: "We could not finish checking this",
      description:
        "This is usually caused by a file we cannot read or a temporary issue. You can try again.",
      tone: "danger" as const,
    }
  }

  if (contentStatus === "BANNED" || moderation === "REJECTED") {
    return {
      title: "Please review this content",
      description:
        "This file may not be suitable to share yet. Edit it or replace it before making it available.",
      tone: "danger" as const,
    }
  }

  if (moderation === "NEEDS_REVIEW") {
    return {
      title: "Needs a closer look",
      description:
        "We could not clearly approve this content. Please review it before making it available.",
      tone: "warning" as const,
    }
  }

  if (contentStatus === "PROCESSING" || moderation === "PENDING") {
    return {
      title: "Checking your content",
      description:
        "We are reading the file and checking whether learners can see it.",
      tone: "neutral" as const,
    }
  }

  if (
    contentStatus === "AVAILABLE" ||
    moderation === "APPROVED" ||
    moderation === "READY"
  ) {
    return {
      title: "Ready for learners",
      description: "We read the file and it passed the content check.",
      tone: "success" as const,
    }
  }

  return null
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
      label: "Upload done",
      state:
        contentStatus === "PENDING"
          ? "pending"
          : failed
            ? "failed"
            : "complete",
    },
    {
      label: "Checking started",
      state: processing ? "active" : "complete",
    },
    {
      label: "Sharing check",
      state: rejected || failed ? "failed" : approved ? "complete" : "active",
    },
    {
      label: "Ready for learners",
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
  ruleVersion,
  compact = false,
}: ContentModerationChecklistProps) {
  const items = getChecklistState({ status, moderationStatus, verified })
  const violationReasons = (reasons ?? []).filter(
    (reason) => reason.trim() && !isPlaceholderModerationReason(reason)
  )
  const hasReasons = violationReasons.length > 0
  const summary = getModerationSummary({ status, moderationStatus })

  return (
    <div
      className={cn(
        "rounded-md border border-border/60 bg-background/70",
        compact ? "mt-2 p-2" : "p-3"
      )}
    >
      {summary ? (
        <div
          className={cn(
            "mb-3 rounded-md border px-3 py-2 text-xs",
            summary.tone === "danger" &&
              "border-destructive/30 bg-destructive/8 text-destructive",
            summary.tone === "warning" &&
              "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
            summary.tone === "success" &&
              "border-primary/30 bg-primary/8 text-primary",
            summary.tone === "neutral" &&
              "border-border bg-muted/40 text-muted-foreground"
          )}
        >
          <p className="font-semibold">{summary.title}</p>
          <p className="mt-1 leading-5">{summary.description}</p>
        </div>
      ) : null}
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
      {hasReasons ? (
        <div className="mt-2 border-t border-border/60 pt-2">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-destructive">
            <span>What happened</span>
            {ruleVersion ? (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px]">
                {ruleVersion}
              </span>
            ) : null}
          </div>
          <ul className="space-y-1 text-xs text-destructive">
            {violationReasons.slice(0, 3).map((reason) => (
              <li key={reason} className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                <span className="line-clamp-2">
                  {getFriendlyModerationReason(reason)}
                </span>
              </li>
            ))}
          </ul>
        </div>
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
  const [recheckResource, resourceState] =
    useRecheckResourceModerationMutation()
  const [recheckTutorial, tutorialState] =
    useRecheckTutorialModerationMutation()
  const isLoading = resourceState.isLoading || tutorialState.isLoading

  async function handleRecheck() {
    try {
      if (contentType === "resource") {
        await recheckResource({ resourceId: contentId }).unwrap()
      } else {
        await recheckTutorial({ tutorialId: contentId }).unwrap()
      }
      toast.success("Content check finished")
      router.refresh()
    } catch {
      toast.error(
        "We could not check this content right now. Please try again."
      )
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
      Check again
    </Button>
  )
}

interface DeleteContentButtonProps {
  contentId: string
  contentType: "resource" | "tutorial"
}

export function DeleteContentButton({
  contentId,
  contentType,
}: DeleteContentButtonProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const [deleteResource, resourceState] = useDeleteResourceMutation()
  const [deleteTutorial, tutorialState] = useDeleteTutorialMutation()
  const isLoading = resourceState.isLoading || tutorialState.isLoading

  async function handleDelete() {
    try {
      if (contentType === "resource") {
        await deleteResource(contentId).unwrap()
      } else {
        await deleteTutorial(contentId).unwrap()
      }
      toast.success(
        contentType === "resource" ? "Resource deleted" : "Tutorial deleted"
      )
      setOpen(false)
      router.refresh()
    } catch {
      toast.error(
        contentType === "resource"
          ? "We could not delete this resource"
          : "We could not delete this tutorial"
      )
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isLoading) {
          setOpen(nextOpen)
        }
      }}
      variant="error"
      icon={<Trash2 />}
      title={`Delete this ${contentType}?`}
      description={`This ${contentType} will be removed from your content list. You cannot undo this.`}
      confirmLabel="Delete"
      loading={isLoading}
      onConfirm={handleDelete}
      trigger={
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="w-fit"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          Delete
        </Button>
      }
    >
      This removes the item from your creator pages.
    </ConfirmDialog>
  )
}
