"use client"

import { useMemo, useState } from "react"

import Link from "next/link"

import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  FileText,
  Loader2,
  Video,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  ContentModerationStatus,
  ResourceStatus,
  TutorialStatus,
  type ResourceQueryItem,
  type TutorialQueryItem,
} from "@/features/content/types"
import {
  useGetMyResourcesQuery,
  useGetMyTutorialsQuery,
} from "@/features/content/services/content-api"
import { cn } from "@/lib/utils"

type ModerationNotificationTone = "info" | "success" | "warning" | "danger"

interface ModerationNotification {
  id: string
  href: string
  title: string
  type: "Resource" | "Tutorial"
  statusLabel: string
  description: string
  reason?: string
  tone: ModerationNotificationTone
  updatedAt: string
}

const ACTIVE_RESOURCE_STATUSES = new Set<ResourceStatus>([
  ResourceStatus.PENDING,
  ResourceStatus.PROCESSING,
  ResourceStatus.FAILED,
  ResourceStatus.BANNED,
])

const ACTIVE_TUTORIAL_STATUSES = new Set<TutorialStatus>([
  TutorialStatus.PENDING,
  TutorialStatus.PROCESSING,
  TutorialStatus.FAILED,
  TutorialStatus.BANNED,
])

function getModerationMeta(
  contentStatus: ResourceStatus | TutorialStatus,
  moderationStatus?: ContentModerationStatus
): Pick<ModerationNotification, "statusLabel" | "description" | "tone"> {
  if (
    contentStatus === ResourceStatus.BANNED ||
    contentStatus === TutorialStatus.BANNED ||
    moderationStatus === ContentModerationStatus.REJECTED
  ) {
    return {
      statusLabel: "Rejected",
      description: "Nội dung không đạt kiểm duyệt.",
      tone: "danger",
    }
  }

  if (
    contentStatus === ResourceStatus.FAILED ||
    contentStatus === TutorialStatus.FAILED ||
    moderationStatus === ContentModerationStatus.ERROR
  ) {
    return {
      statusLabel: "Failed",
      description: "Quá trình xử lý hoặc kiểm duyệt gặp lỗi.",
      tone: "danger",
    }
  }

  if (moderationStatus === ContentModerationStatus.NEEDS_REVIEW) {
    return {
      statusLabel: "Needs review",
      description: "Nội dung cần admin xem xét thêm.",
      tone: "warning",
    }
  }

  if (
    contentStatus === ResourceStatus.PROCESSING ||
    contentStatus === TutorialStatus.PROCESSING ||
    moderationStatus === ContentModerationStatus.PENDING
  ) {
    return {
      statusLabel: "Processing",
      description: "Đang trích xuất nội dung và kiểm duyệt nền.",
      tone: "info",
    }
  }

  if (moderationStatus === ContentModerationStatus.APPROVED) {
    return {
      statusLabel: "Approved",
      description: "Nội dung đã được duyệt và có thể hiển thị.",
      tone: "success",
    }
  }

  return {
    statusLabel: "Pending",
    description: "Nội dung đang chờ xử lý.",
    tone: "info",
  }
}

function isActiveResourceNotification(resource: ResourceQueryItem) {
  return (
    ACTIVE_RESOURCE_STATUSES.has(resource.status) ||
    resource.moderationStatus === ContentModerationStatus.PENDING ||
    resource.moderationStatus === ContentModerationStatus.REJECTED ||
    resource.moderationStatus === ContentModerationStatus.NEEDS_REVIEW ||
    resource.moderationStatus === ContentModerationStatus.ERROR
  )
}

function isActiveTutorialNotification(tutorial: TutorialQueryItem) {
  return (
    ACTIVE_TUTORIAL_STATUSES.has(tutorial.status) ||
    tutorial.moderationStatus === ContentModerationStatus.PENDING ||
    tutorial.moderationStatus === ContentModerationStatus.REJECTED ||
    tutorial.moderationStatus === ContentModerationStatus.NEEDS_REVIEW ||
    tutorial.moderationStatus === ContentModerationStatus.ERROR
  )
}

function buildResourceNotification(
  resource: ResourceQueryItem
): ModerationNotification {
  const meta = getModerationMeta(resource.status, resource.moderationStatus)

  return {
    id: `resource-${resource.id}`,
    href: "/dashboard/resources",
    title: resource.title,
    type: "Resource",
    updatedAt: resource.moderatedAt ?? resource.updatedAt ?? resource.createdAt,
    reason: resource.moderationReasons?.[0],
    ...meta,
  }
}

function buildTutorialNotification(
  tutorial: TutorialQueryItem
): ModerationNotification {
  const meta = getModerationMeta(tutorial.status, tutorial.moderationStatus)

  return {
    id: `tutorial-${tutorial.id}`,
    href: "/dashboard/tutorials",
    title: tutorial.title,
    type: "Tutorial",
    updatedAt: tutorial.moderatedAt ?? tutorial.updatedAt ?? tutorial.createdAt,
    reason: tutorial.moderationReasons?.[0],
    ...meta,
  }
}

function toneClassName(tone: ModerationNotificationTone) {
  switch (tone) {
    case "danger":
      return "bg-destructive/10 text-destructive"
    case "warning":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "success":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    default:
      return "bg-primary/10 text-primary"
  }
}

export function ContentModerationNotifications() {
  const [open, setOpen] = useState(false)
  const {
    data: resourceResponse,
    isFetching: resourcesFetching,
    isError: resourcesError,
  } = useGetMyResourcesQuery(undefined, {
    pollingInterval: 30_000,
    refetchOnMountOrArgChange: true,
  })
  const {
    data: tutorialResponse,
    isFetching: tutorialsFetching,
    isError: tutorialsError,
  } = useGetMyTutorialsQuery(undefined, {
    pollingInterval: 30_000,
    refetchOnMountOrArgChange: true,
  })

  const { activeCount, notifications } = useMemo(() => {
    const resources = resourceResponse?.data?.data ?? []
    const tutorials = tutorialResponse?.data?.data ?? []
    const activeResources = resources.filter(isActiveResourceNotification)
    const activeTutorials = tutorials.filter(isActiveTutorialNotification)

    const activeNotifications = [
      ...activeResources.map(buildResourceNotification),
      ...activeTutorials.map(buildTutorialNotification),
    ]

    const approvedFallback = [
      ...resources
        .filter(
          (item) =>
            item.status === ResourceStatus.AVAILABLE &&
            item.moderationStatus === ContentModerationStatus.APPROVED
        )
        .map(buildResourceNotification),
      ...tutorials
        .filter(
          (item) =>
            item.status === TutorialStatus.AVAILABLE &&
            item.moderationStatus === ContentModerationStatus.APPROVED
        )
        .map(buildTutorialNotification),
    ]

    const sorted = [...activeNotifications, ...approvedFallback]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 6)

    return {
      activeCount: activeNotifications.length,
      notifications: sorted,
    }
  }, [resourceResponse, tutorialResponse])

  const isFetching = resourcesFetching || tutorialsFetching
  const hasError = resourcesError || tutorialsError

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Content moderation notifications"
          className="relative hidden md:inline-flex"
        >
          {isFetching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Bell className="size-4" />
          )}
          {activeCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
              {activeCount > 9 ? "9+" : activeCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-1rem)] gap-3">
        <PopoverHeader>
          <PopoverTitle className="text-sm font-semibold">
            Content moderation
          </PopoverTitle>
          <PopoverDescription className="text-xs">
            Trạng thái resource và tutorial vừa upload.
          </PopoverDescription>
        </PopoverHeader>

        {hasError ? (
          <div className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Không tải được thông báo kiểm duyệt.
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl bg-secondary/70 px-3 py-4 text-center text-xs text-muted-foreground">
            Không có thông báo kiểm duyệt.
          </div>
        ) : (
          <div className="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
            {notifications.map((item) => {
              const Icon = item.type === "Tutorial" ? Video : FileText
              const StatusIcon =
                item.tone === "success" ? CheckCircle2 : AlertTriangle

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="rounded-2xl border border-border/70 p-3 transition-colors hover:bg-secondary/70"
                  onClick={() => setOpen(false)}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 rounded-full bg-secondary p-2">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {item.title}
                        </span>
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            toneClassName(item.tone)
                          )}
                        >
                          <StatusIcon className="size-3" />
                          {item.statusLabel}
                        </span>
                      </span>
                      <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {item.description}
                        {item.reason ? ` ${item.reason}` : ""}
                      </span>
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
