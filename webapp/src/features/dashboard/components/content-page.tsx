"use client"

import { useEffect, useMemo } from "react"

import { useSession } from "next-auth/react"

import { useDispatch } from "react-redux"

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
  const { status: sessionStatus } = useSession()
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

  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      return
    }

    const events = new EventSource("/api/notifications/stream")

    const refreshContent = () => {
      dispatch(
        baseApi.util.invalidateTags(["Notification", "Resource", "Tutorial"])
      )
    }

    events.addEventListener("notification", refreshContent)

    return () => {
      events.removeEventListener("notification", refreshContent)
      events.close()
    }
  }, [dispatch, sessionStatus])

  return (
    <section className="w-full space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Content</h1>
        <p className="text-sm text-muted-foreground">
          Manage resources, collections, tutorials, and upload history from one
          creator workspace.
        </p>
      </div>

      <Tabs defaultValue="resources" className="w-full">
        <TabsList className="w-full justify-start sm:w-fit">
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="tutorials">Tutorials</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
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
