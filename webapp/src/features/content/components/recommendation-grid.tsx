"use client"

import { useState } from "react"

import Link from "next/link"

import { CollectionCard } from "@/components/molecules/collection-card"
import { ResourceCard } from "@/components/molecules/resource-card"
import { TutorialCard } from "@/components/molecules/tutorial-card"
import { Button } from "@/components/ui/button"
import type {
  CollectionQueryItem,
  RecommendationItem,
  ResourceQueryItem,
  TutorialQueryItem,
} from "@/features/content/types"

import {
  mapCollectionToCard,
  mapResourceToCard,
  mapTutorialToCard,
} from "../mappers"

interface RecommendationGridProps {
  items: RecommendationItem[]
  /** Number of items to show per page */
  pageSize: number
  /** Enable load more functionality */
  hasLoadMore?: boolean
}

export function RecommendationGrid({ items, pageSize, hasLoadMore = false }: RecommendationGridProps) {
  const [visibleCount, setVisibleCount] = useState(pageSize)

  const visibleItems = items.slice(0, visibleCount)
  const hasMore = hasLoadMore && visibleCount < items.length

  return (
    <>
      <div className="grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((rec) => {
          const itemType = rec.itemType
          const content = rec.content

          if (!content) {
            return (
              <RecommendationFallbackCard
                key={rec.itemId}
                title={rec.display?.title || "Recommended content"}
                itemType={itemType}
                slug={rec.display?.slug}
                score={rec.score}
                reasons={rec.reasons}
              />
            )
          }

          if (itemType === "RESOURCE") {
            return (
              <ResourceCard
                key={rec.itemId}
                resource={mapResourceToCard(content as ResourceQueryItem)}
              />
            )
          }
          if (itemType === "TUTORIAL") {
            return (
              <TutorialCard
                key={rec.itemId}
                tutorial={mapTutorialToCard(content as TutorialQueryItem)}
              />
            )
          }
          if (itemType === "RESOURCE_COLLECTION" || itemType === "COLLECTION") {
            return (
              <CollectionCard
                key={rec.itemId}
                collection={mapCollectionToCard(
                  content as CollectionQueryItem,
                  "resource"
                )}
                imageSizes="(max-width: 1024px) 100vw, 33vw"
              />
            )
          }
          if (itemType === "TUTORIAL_COLLECTION") {
            return (
              <CollectionCard
                key={rec.itemId}
                collection={mapCollectionToCard(
                  content as CollectionQueryItem,
                  "tutorial"
                )}
                imageSizes="(max-width: 1024px) 100vw, 33vw"
              />
            )
          }
          return null
        })}
      </div>

      {hasMore ? (
        <div className="flex flex-col items-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setVisibleCount((prev) => prev + pageSize)}
          >
            Load More
          </Button>          
        </div>
      ):null}
    </>
  )
}

function RecommendationFallbackCard({
  title,
  itemType,
  slug,
  score,
  reasons,
}: {
  title: string
  itemType: RecommendationItem["itemType"]
  slug?: string
  score: number
  reasons: string[]
}) {
  const href = slug ? getContentHref(itemType, slug) : undefined
  const body = (
    <article className="flex h-full min-h-40 flex-col justify-between rounded-lg border border-border/80 bg-card p-4 shadow-sm transition hover:border-primary/40">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>{formatItemType(itemType)}</span>
          <span>{Math.round(score * 100)}%</span>
        </div>
        <h3 className="line-clamp-2 text-base font-semibold text-foreground">
          {title}
        </h3>
      </div>
      {reasons.length > 0 ? (
        <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">
          {reasons.join(", ")}
        </p>
      ) : null}
    </article>
  )

  return href ? <Link href={href}>{body}</Link> : body
}

function getContentHref(itemType: RecommendationItem["itemType"], slug: string) {
  if (itemType === "TUTORIAL") {
    return `/home/tutorials/${slug}`
  }
  if (itemType === "TUTORIAL_COLLECTION") {
    return `/home/tutorials/collections/${slug}`
  }
  if (itemType === "RESOURCE_COLLECTION" || itemType === "COLLECTION") {
    return `/home/resources/collections/${slug}`
  }
  return `/home/resources/${slug}`
}

function formatItemType(itemType: RecommendationItem["itemType"]) {
  return itemType.toLowerCase().replaceAll("_", " ")
}
