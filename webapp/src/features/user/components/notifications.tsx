"use client"

import { useEffect, useMemo, useState } from "react"

import Link from "next/link"

import { useSession } from "next-auth/react"

import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  FileText,
  Loader2,
  MessageCircle,
  ShoppingBag,
  Video,
} from "lucide-react"
import { useDispatch } from "react-redux"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatVND } from "@/features/billing/types/billing-types"
import {
  useGetMyResourcesQuery,
  useGetMyTutorialsQuery,
} from "@/features/content/services/content-api"
import {
  ContentModerationStatus,
  ResourceStatus,
  TutorialStatus,
  type ResourceQueryItem,
  type TutorialQueryItem,
} from "@/features/content/types"
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
} from "@/features/user/services/notification-api"
import { useI18n } from "@/i18n/language-provider"
import { baseApi } from "@/lib/redux/base-api"
import { cn } from "@/lib/utils"

type ModerationNotificationTone = "info" | "success" | "warning" | "danger"

interface ModerationNotification {
  id: string
  href: string
  title: string
  type: string
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

const READ_ALL_STORAGE_KEY = "buddy.notifications.readAllAt"

function isAfterReadAll(updatedAt: string, readAllAt: string | null) {
  if (!readAllAt) {
    return true
  }

  return new Date(updatedAt).getTime() > new Date(readAllAt).getTime()
}

function getModerationMeta(
  contentStatus: ResourceStatus | TutorialStatus,
  moderationStatus: ContentModerationStatus | undefined,
  t: (key: Parameters<ReturnType<typeof useI18n>["t"]>[0]) => string
): Pick<ModerationNotification, "statusLabel" | "description" | "tone"> {
  if (
    contentStatus === ResourceStatus.BANNED ||
    contentStatus === TutorialStatus.BANNED ||
    moderationStatus === ContentModerationStatus.REJECTED
  ) {
    return {
      statusLabel: t("notifications.status.rejected"),
      description: t("notifications.message.rejected"),
      tone: "danger",
    }
  }

  if (
    contentStatus === ResourceStatus.FAILED ||
    contentStatus === TutorialStatus.FAILED ||
    moderationStatus === ContentModerationStatus.ERROR
  ) {
    return {
      statusLabel: t("notifications.status.failed"),
      description: t("notifications.message.failed"),
      tone: "danger",
    }
  }

  if (moderationStatus === ContentModerationStatus.NEEDS_REVIEW) {
    return {
      statusLabel: t("notifications.status.needsReview"),
      description: t("notifications.message.needsReview"),
      tone: "warning",
    }
  }

  if (
    contentStatus === ResourceStatus.PROCESSING ||
    contentStatus === TutorialStatus.PROCESSING ||
    moderationStatus === ContentModerationStatus.PENDING
  ) {
    return {
      statusLabel: t("notifications.status.processing"),
      description: t("notifications.message.processing"),
      tone: "info",
    }
  }

  if (moderationStatus === ContentModerationStatus.APPROVED) {
    return {
      statusLabel: t("notifications.status.approved"),
      description: t("notifications.message.approved"),
      tone: "success",
    }
  }

  return {
    statusLabel: t("notifications.status.pending"),
    description: t("notifications.message.pending"),
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
  resource: ResourceQueryItem,
  t: (key: Parameters<ReturnType<typeof useI18n>["t"]>[0]) => string
): ModerationNotification {
  const meta = getModerationMeta(resource.status, resource.moderationStatus, t)

  return {
    id: `resource-${resource.id}`,
    href: "/content",
    title: resource.title,
    type: t("notifications.type.resource"),
    updatedAt: resource.moderatedAt ?? resource.updatedAt ?? resource.createdAt,
    reason: resource.moderationReasons?.[0],
    ...meta,
  }
}

function buildTutorialNotification(
  tutorial: TutorialQueryItem,
  t: (key: Parameters<ReturnType<typeof useI18n>["t"]>[0]) => string
): ModerationNotification {
  const meta = getModerationMeta(tutorial.status, tutorial.moderationStatus, t)

  return {
    id: `tutorial-${tutorial.id}`,
    href: "/content",
    title: tutorial.title,
    type: t("notifications.type.tutorial"),
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

function getModerationEventMeta(
  decision: "APPROVED" | "REJECTED" | "NEEDS_REVIEW" | "ERROR" | undefined,
  t: (key: Parameters<ReturnType<typeof useI18n>["t"]>[0]) => string
): Pick<ModerationNotification, "statusLabel" | "description" | "tone"> {
  switch (decision) {
    case "APPROVED":
      return {
        statusLabel: t("notifications.status.approved"),
        description: t("notifications.message.approved"),
        tone: "success",
      }
    case "REJECTED":
      return {
        statusLabel: t("notifications.status.rejected"),
        description: t("notifications.message.rejected"),
        tone: "danger",
      }
    case "ERROR":
      return {
        statusLabel: t("notifications.status.failed"),
        description: t("notifications.message.failed"),
        tone: "danger",
      }
    case "NEEDS_REVIEW":
      return {
        statusLabel: t("notifications.status.needsReview"),
        description: t("notifications.message.needsReview"),
        tone: "warning",
      }
    default:
      return {
        statusLabel: t("notifications.status.completed"),
        description: t("notifications.message.completed"),
        tone: "info",
      }
  }
}

export function Notifications() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [readAllAt, setReadAllAt] = useState<string | null>(null)
  const dispatch = useDispatch()
  const { data: session, status: sessionStatus } = useSession()
  const [markAllNotificationsRead] = useMarkAllNotificationsReadMutation()
  const {
    data: resourceResponse,
    isFetching: resourcesFetching,
    isError: resourcesError,
  } = useGetMyResourcesQuery(undefined, {
    // Poll only while the popover is open (expensive, every 30s).
    // refetchOnFocus / refetchOnReconnect stay unconditional so the
    // badge count refreshes when the user returns to the tab or
    // reconnects — these are cheap one-shot fetches, not continuous.
    pollingInterval: open ? 30_000 : 0,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  })
  const {
    data: tutorialResponse,
    isFetching: tutorialsFetching,
    isError: tutorialsError,
  } = useGetMyTutorialsQuery(undefined, {
    pollingInterval: open ? 30_000 : 0,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  })
  const {
    data: notificationResponse,
    isFetching: notificationsFetching,
    isError: notificationsError,
  } = useGetNotificationsQuery(undefined, {
    pollingInterval: open ? 30_000 : 0,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  })

  const { activeCount, notifications } = useMemo(() => {
    const resources = resourceResponse?.data?.data ?? []
    const tutorials = tutorialResponse?.data?.data ?? []
    const activeResources = resources
      .filter(isActiveResourceNotification)
      .map((item) => buildResourceNotification(item, t))
    const activeTutorials = tutorials
      .filter(isActiveTutorialNotification)
      .map((item) => buildTutorialNotification(item, t))
    const unreadActiveNotifications = [
      ...activeResources,
      ...activeTutorials,
    ].filter((item) => isAfterReadAll(item.updatedAt, readAllAt))

    const activeNotifications = [...activeResources, ...activeTutorials]
    const storedNotifications = notificationResponse?.data ?? []
    const purchaseNotifications: ModerationNotification[] = storedNotifications
      .filter((item) => item.channel === "purchase")
      .map((item) => ({
        id: `purchase-${item._id}`,
        href:
          item.templateId === "purchase-seller"
            ? "/settings/billing/transactions"
            : "/library",
        title: item.subject ?? t("notifications.message.purchaseCompleted"),
        type: t("notifications.type.purchase"),
        statusLabel:
          item.templateId === "purchase-seller"
            ? t("notifications.status.sold")
            : t("notifications.status.paid"),
        description: `${t("notifications.message.purchaseItems", {
          count: String(item.templateData.itemCount ?? 1),
        })} · ${formatVND(item.templateData.amount ?? "0")}`,
        tone: "success",
        updatedAt: item.createdAt,
      }))
    const moderationNotifications: ModerationNotification[] =
      storedNotifications
        .filter((item) => item.channel === "content-moderation")
        .map((item) => {
          const meta = getModerationEventMeta(item.templateData.decision, t)
          const contentType =
            item.templateData.contentType === "TUTORIAL"
              ? t("notifications.type.tutorial")
              : t("notifications.type.resource")

          return {
            id: `moderation-${item._id}`,
            href: "/content",
            title:
              item.templateData.title ??
              item.subject ??
              t("notifications.message.contentModerated"),
            type: contentType,
            reason: item.templateData.reasons?.[0],
            updatedAt: item.templateData.moderatedAt ?? item.createdAt,
            ...meta,
          }
        })
    const forumMentionNotifications: ModerationNotification[] =
      storedNotifications
        .filter((item) => item.channel === "forum-mention")
        .map((item) => ({
          id: `forum-mention-${item._id}`,
          href: item.templateData.href ?? "/forum",
          title: item.subject ?? t("notifications.status.mention"),
          type: t("notifications.type.forum"),
          statusLabel: t("notifications.status.mention"),
          description:
            item.templateData.excerpt ??
            `${item.templateData.actorName ?? t("notifications.message.unknownActor")} ${t("notifications.message.mentioned")} ${item.templateData.topicTitle ?? t("notifications.message.unknownTopic")}.`,
          tone: "info",
          updatedAt: item.templateData.createdAt ?? item.createdAt,
        }))
    const unreadStoredCount = storedNotifications.filter(
      (item) =>
        !item.readAt &&
        (item.channel === "purchase" ||
          item.channel === "content-moderation" ||
          item.channel === "forum-mention")
    ).length

    const approvedFallback = [
      ...resources
        .filter(
          (item) =>
            item.status === ResourceStatus.AVAILABLE &&
            item.moderationStatus === ContentModerationStatus.APPROVED
        )
        .map((item) => buildResourceNotification(item, t)),
      ...tutorials
        .filter(
          (item) =>
            item.status === TutorialStatus.AVAILABLE &&
            item.moderationStatus === ContentModerationStatus.APPROVED
        )
        .map((item) => buildTutorialNotification(item, t)),
    ]

    const sorted = [
      ...moderationNotifications,
      ...forumMentionNotifications,
      ...purchaseNotifications,
      ...activeNotifications,
      ...approvedFallback,
    ]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 6)

    return {
      activeCount: unreadActiveNotifications.length + unreadStoredCount,
      notifications: sorted,
    }
  }, [notificationResponse, readAllAt, resourceResponse, t, tutorialResponse])

  const isFetching =
    resourcesFetching || tutorialsFetching || notificationsFetching
  const hasError = resourcesError || tutorialsError || notificationsError

  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = localStorage.getItem(READ_ALL_STORAGE_KEY)
      if (stored) {
        setReadAllAt(stored)
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session?.accessToken) {
      return
    }

    let events: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const refreshNotifications = () => {
      dispatch(
        baseApi.util.invalidateTags([
          "Notification",
          "Wallet",
          "Transaction",
          "Resource",
          "Tutorial",
        ])
      )
    }

    const connect = () => {
      events?.close()
      events = new EventSource("/api/notifications/stream")
      events.addEventListener("notification", refreshNotifications)
      events.onerror = () => {
        events?.close()
        events = null
        retryTimer = setTimeout(connect, 30_000)
      }
    }

    connect()

    return () => {
      if (retryTimer) {
        clearTimeout(retryTimer)
      }
      events?.removeEventListener("notification", refreshNotifications)
      events?.close()
    }
  }, [dispatch, session?.accessToken, sessionStatus])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen || activeCount === 0) {
      return
    }

    const nextReadAllAt = new Date().toISOString()
    setReadAllAt(nextReadAllAt)
    localStorage.setItem(READ_ALL_STORAGE_KEY, nextReadAllAt)

    markAllNotificationsRead()
      .unwrap()
      .catch(() => {
        dispatch(baseApi.util.invalidateTags(["Notification"]))
      })
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("notifications.aria")}
          className="relative inline-flex"
        >
          {isFetching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Bell className="size-4" />
          )}
          {activeCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-bold text-destructive-foreground">
              {activeCount > 9 ? "9+" : activeCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[22rem] max-w-[calc(100vw-1rem)] gap-3"
      >
        <PopoverHeader>
          <PopoverTitle className="text-sm font-semibold">
            {t("notifications.title")}
          </PopoverTitle>
          <PopoverDescription className="text-xs">
            {t("notifications.description")}
          </PopoverDescription>
        </PopoverHeader>

        {hasError ? (
          <div className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {t("notifications.loadError")}
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl bg-secondary/70 px-3 py-4 text-center text-xs text-muted-foreground">
            {t("notifications.empty")}
          </div>
        ) : (
          <div className="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
            {notifications.map((item) => {
              const Icon =
                item.type === t("notifications.type.tutorial")
                  ? Video
                  : item.type === t("notifications.type.purchase")
                    ? ShoppingBag
                    : item.type === t("notifications.type.forum")
                      ? MessageCircle
                      : FileText
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
