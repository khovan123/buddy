"use client"

import { useEffect, useMemo } from "react"

import Link from "next/link"

import { useSession } from "next-auth/react"

import { CheckCircle2, Eye, FolderKanban, UploadCloud } from "lucide-react"
import { useDispatch } from "react-redux"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreatorCollectionsPanel } from "@/features/content/components/creator-content/creator-collections-panel"
import { CreatorResourcesPanel } from "@/features/content/components/creator-content/creator-resources-panel"
import { CreatorTutorialsPanel } from "@/features/content/components/creator-content/creator-tutorials-panel"
import {
  useGetMyResourcesQuery,
  useGetMyTutorialsQuery,
} from "@/features/content/services/content-api"
import type {
  CollectionQueryItem,
  ResourceQueryItem,
  TutorialQueryItem,
} from "@/features/content/types"
import type {
  ContentResourceItem,
  ContentTutorialItem,
} from "@/features/content/types/creator-content.types"
import { useI18n } from "@/i18n/language-provider"
import { baseApi } from "@/lib/redux/base-api"

function normalizeResource(item: ResourceQueryItem): ContentResourceItem {
  return {
    ...item,
    status: item.status,
    moderationStatus: item.moderationStatus,
    resourceVerified: item.isVerified,
  }
}

function normalizeTutorial(item: TutorialQueryItem): ContentTutorialItem {
  return {
    ...item,
    status: item.status,
    moderationStatus: item.moderationStatus,
  }
}

export function ContentPage({
  tutorials,
  resources,
  resourceCollections,
  tutorialCollections,
}: {
  tutorials: ContentTutorialItem[]
  resources: ContentResourceItem[]
  resourceCollections: CollectionQueryItem[]
  tutorialCollections: CollectionQueryItem[]
}) {
  const dispatch = useDispatch()
  const { data: session, status: sessionStatus } = useSession()
  const { t } = useI18n()
  const { data: resourceResponse } = useGetMyResourcesQuery(undefined, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  })
  const { data: tutorialResponse } = useGetMyTutorialsQuery(undefined, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  })

  const liveResources = useMemo(() => {
    const items = resourceResponse?.data?.data
    return items?.length ? items.map(normalizeResource) : resources
  }, [resourceResponse, resources])

  const liveTutorials = useMemo(() => {
    const items = tutorialResponse?.data?.data
    return items?.length ? items.map(normalizeTutorial) : tutorials
  }, [tutorialResponse, tutorials])

  const creatorChecklist = [
    {
      label: t("content.checklist.resource"),
      done: liveResources.length > 0,
      href: "/home/resources/create",
      icon: UploadCloud,
    },
    {
      label: t("content.checklist.collection"),
      done: resourceCollections.length + tutorialCollections.length > 0,
      href: "/home/collections/create",
      icon: FolderKanban,
    },
    {
      label: t("content.checklist.review"),
      done: liveResources.some(
        (resource) =>
          resource.status === "AVAILABLE" || resource.status === "FAILED"
      ),
      href: "/content",
      icon: Eye,
    },
  ]

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session?.accessToken) {
      return
    }

    let events: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const refreshContent = () => {
      dispatch(
        baseApi.util.invalidateTags(["Notification", "Resource", "Tutorial"])
      )
    }

    const connect = () => {
      events?.close()
      events = new EventSource("/api/notifications/stream")
      events.addEventListener("notification", refreshContent)
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
      events?.removeEventListener("notification", refreshContent)
      events?.close()
    }
  }, [dispatch, session?.accessToken, sessionStatus])

  return (
    <section className="w-full space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("content.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("content.description")}
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-[1fr_auto] md:items-center">
        <div className="grid gap-2 md:grid-cols-3">
          {creatorChecklist.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex min-w-0 items-center gap-3 rounded-md border border-border bg-background px-3 py-2 transition-colors hover:bg-muted"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {item.done ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {item.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {item.done ? t("common.done") : t("common.nextStep")}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/home/resources/create">{t("content.newResource")}</Link>
        </Button>
      </div>

      <Tabs defaultValue="resources" className="w-full">
        <TabsList className="w-full justify-start sm:w-fit">
          <TabsTrigger value="resources">{t("content.resources")}</TabsTrigger>
          <TabsTrigger value="tutorials">{t("content.tutorials")}</TabsTrigger>
          <TabsTrigger value="collections">
            {t("content.collections")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="mt-4">
          <CreatorResourcesPanel resources={liveResources} />
        </TabsContent>
        <TabsContent value="tutorials" className="mt-4">
          <CreatorTutorialsPanel tutorials={liveTutorials} />
        </TabsContent>
        <TabsContent value="collections" className="mt-4">
          <CreatorCollectionsPanel
            resourceCollections={resourceCollections}
            tutorialCollections={tutorialCollections}
          />
        </TabsContent>
      </Tabs>
    </section>
  )
}
