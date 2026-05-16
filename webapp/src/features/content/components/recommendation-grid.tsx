"use client"

import { useState } from "react"


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
      <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((rec) => {
          const itemType = rec.itemType
          const content = rec.content!

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
