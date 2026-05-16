import { Suspense } from "react"

import { SectionHeading } from "@/components/atoms/section-heading"
import { CollectionCard } from "@/components/molecules/collection-card"
import { ResourceCard } from "@/components/molecules/resource-card"
import { TutorialCard } from "@/components/molecules/tutorial-card"
import { getTrending } from "@/features/content/services/content.service"
import type {
  CollectionQueryItem,
  ResourceQueryItem,
  TutorialQueryItem,
} from "@/features/content/types"

import {
  mapCollectionToCard,
  mapResourceToCard,
  mapTutorialToCard,
} from "../mappers"

interface Props {
  majorId?: string
  days?: number
  limit?: number
}

async function TrendingList({ majorId, days, limit = 6 }: Props) {
  const data = await getTrending(majorId, days, limit)
  if (!data || !data.items || data.items.length === 0) {
    return null
  }

  const validItems = data.items.filter((item) => item.content != null)

  if (validItems.length === 0) {
    return null
  }

  return (
    <section className="space-y-5 rounded-2xl border border-border/80 bg-card/40 p-6">
      <SectionHeading
        badge="Hot Right Now"
        title="Top Trending"
        description="Most interacted and highly rated content this week."
      />
      <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {validItems.map((rec) => {
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
    </section>
  )
}

export function TrendingSection(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="h-48 w-full animate-pulse rounded-2xl bg-muted" />
      }
    >
      <TrendingList {...props} />
    </Suspense>
  )
}
