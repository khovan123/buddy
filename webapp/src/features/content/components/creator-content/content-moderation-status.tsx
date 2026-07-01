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
import { useI18n } from "@/i18n/language-provider"
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
  const { t } = useI18n()

  if (status === "AVAILABLE") {
    return (
      <Badge variant="default" className="uppercase">
        <CheckCircle2 className="size-3" />
        {t("content.moderation.status.ready")}
      </Badge>
    )
  }

  if (status === "BANNED" || moderationStatus === "REJECTED") {
    return (
      <Badge variant="destructive" className="uppercase">
        <ShieldAlert className="size-3" />
        {t("content.moderation.status.needsChanges")}
      </Badge>
    )
  }

  if (status === "FAILED" || moderationStatus === "ERROR") {
    return (
      <Badge variant="destructive" className="uppercase">
        <AlertTriangle className="size-3" />
        {t("content.moderation.status.tryAgain")}
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
        {t("content.moderation.status.review")}
      </Badge>
    )
  }

  if (status === "PROCESSING" || moderationStatus === "PENDING") {
    return (
      <Badge variant="secondary" className="uppercase">
        <Clock3 className="size-3" />
        {t("content.moderation.status.checking")}
      </Badge>
    )
  }

  if (status === "AVAILABLE" || moderationStatus === "APPROVED") {
    return (
      <Badge variant="default" className="uppercase">
        <CheckCircle2 className="size-3" />
        {t("content.moderation.status.ready")}
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
  t,
}: Pick<ContentModerationChecklistProps, "status" | "moderationStatus"> & {
  t: ReturnType<typeof useI18n>["t"]
}) {
  const contentStatus = normalizeStatus(status)
  const moderation = normalizeStatus(moderationStatus)

  if (contentStatus === "FAILED" || (moderation === "ERROR" && contentStatus !== "AVAILABLE")) {
    return {
      title: t("content.moderation.summary.failedTitle"),
      description: t("content.moderation.summary.failedDescription"),
      tone: "danger" as const,
    }
  }

  if (contentStatus === "BANNED" || moderation === "REJECTED") {
    return {
      title: t("content.moderation.summary.rejectedTitle"),
      description: t("content.moderation.summary.rejectedDescription"),
      tone: "danger" as const,
    }
  }

  if (moderation === "NEEDS_REVIEW") {
    return {
      title: t("content.moderation.summary.reviewTitle"),
      description: t("content.moderation.summary.reviewDescription"),
      tone: "warning" as const,
    }
  }

  if (contentStatus === "PROCESSING" || moderation === "PENDING") {
    return {
      title: t("content.moderation.summary.processingTitle"),
      description: t("content.moderation.summary.processingDescription"),
      tone: "neutral" as const,
    }
  }

  if (
    contentStatus === "AVAILABLE" ||
    moderation === "APPROVED" ||
    moderation === "READY"
  ) {
    return {
      title: t("content.moderation.summary.readyTitle"),
      description: t("content.moderation.summary.readyDescription"),
      tone: "success" as const,
    }
  }

  return null
}

function getChecklistState({
  status,
  moderationStatus,
  verified,
  t,
}: Pick<
  ContentModerationChecklistProps,
  "status" | "moderationStatus" | "verified"
> & {
  t: ReturnType<typeof useI18n>["t"]
}) {
  const contentStatus = normalizeStatus(status)
  const moderation = normalizeStatus(moderationStatus)
  const rejected = contentStatus === "BANNED" || moderation === "REJECTED"
  const failed = contentStatus === "FAILED" || (moderation === "ERROR" && contentStatus !== "AVAILABLE")
  const approved =
    contentStatus === "AVAILABLE" ||
    moderation === "APPROVED" ||
    Boolean(verified)
  const reviewing = moderation === "NEEDS_REVIEW"
  const processing = contentStatus === "PROCESSING" || moderation === "PENDING"

  return [
    {
      label: t("content.moderation.step.uploadDone"),
      state:
        contentStatus === "PENDING"
          ? "pending"
          : failed
            ? "failed"
            : "complete",
    },
    {
      label: t("content.moderation.step.checkingStarted"),
      state: processing ? "active" : "complete",
    },
    {
      label: t("content.moderation.step.sharingCheck"),
      state: rejected || failed ? "failed" : approved ? "complete" : "active",
    },
    {
      label: t("content.moderation.step.readyForLearners"),
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
  const { t } = useI18n()
  const items = getChecklistState({ status, moderationStatus, verified, t })
  const violationReasons = (reasons ?? []).filter(
    (reason) => reason.trim() && !isPlaceholderModerationReason(reason)
  )
  const hasReasons = violationReasons.length > 0
  const summary = getModerationSummary({ status, moderationStatus, t })

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
      {hasReasons && !isPlaceholderModerationReason ? (
        <div className="mt-2 border-t border-border/60 pt-2">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-destructive">
            <span>{t("content.moderation.whatHappened")}</span>
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
  disabled?: boolean
}

export function ManualModerationCheckButton({
  contentId,
  contentType,
  disabled = false,
}: ManualModerationCheckButtonProps) {
  const { t } = useI18n()
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
      toast.success(t("content.moderation.recheckSuccess"))
      router.refresh()
    } catch {
      toast.error(t("content.moderation.recheckError"))
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-fit"
      disabled={disabled || isLoading}
      onClick={handleRecheck}
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCw className="size-4" />
      )}
      {t("content.moderation.recheckAction")}
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
  const { t } = useI18n()
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
        contentType === "resource"
          ? t("content.moderation.delete.resourceSuccess")
          : t("content.moderation.delete.tutorialSuccess")
      )
      setOpen(false)
      router.refresh()
    } catch {
      toast.error(
        contentType === "resource"
          ? t("content.moderation.delete.resourceError")
          : t("content.moderation.delete.tutorialError")
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
      title={
        contentType === "resource"
          ? t("content.moderation.delete.resourceTitle")
          : t("content.moderation.delete.tutorialTitle")
      }
      description={
        contentType === "resource"
          ? t("content.moderation.delete.resourceDescription")
          : t("content.moderation.delete.tutorialDescription")
      }
      confirmLabel={t("content.moderation.delete.confirm")}
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
          {t("content.moderation.delete.trigger")}
        </Button>
      }
    >
      {t("content.moderation.delete.footnote")}
    </ConfirmDialog>
  )
}
