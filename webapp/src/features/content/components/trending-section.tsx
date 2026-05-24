import { Suspense } from "react"

import Link from "next/link"

import { SectionHeading } from "@/components/atoms/section-heading"
import { CollectionCard } from "@/components/molecules/collection-card"
import { ResourceCard } from "@/components/molecules/resource-card"
import { TutorialCard } from "@/components/molecules/tutorial-card"
import { getTrending } from "@/features/content/services/content.service"
import type {
  CollectionQueryItem,
  ResourceQueryItem,
  TrendingItem,
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

  const validItems = data.items.filter(
    (item) => item.content != null || item.display?.title
  )

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
      <div className="grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {validItems.map((rec) => {
          const itemType = rec.itemType
          const content = rec.content

          if (!content) {
            return (
              <TrendingFallbackCard
                key={rec.itemId}
                title={rec.display?.title || "Trending content"}
                itemType={itemType}
                slug={rec.display?.slug}
                totalInteractions={rec.totalInteractions}
                avgRating={rec.avgRating}
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
    </section>
  )
}

function TrendingFallbackCard({
  title,
  itemType,
  slug,
  totalInteractions,
  avgRating,
}: {
  title: string
  itemType: TrendingItem["itemType"]
  slug?: string
  totalInteractions: number
  avgRating: number
}) {
  const href = slug ? getContentHref(itemType, slug) : undefined
  const body = (
    <article className="flex h-full min-h-40 flex-col justify-between rounded-lg border border-border/80 bg-card p-4 shadow-sm transition hover:border-primary/40">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>{formatItemType(itemType)}</span>
          <span>{totalInteractions} interactions</span>
        </div>
        <h3 className="line-clamp-2 text-base font-semibold text-foreground">
          {title}
        </h3>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        {avgRating > 0 ? `${avgRating.toFixed(1)} average rating` : "Trending this week"}
      </p>
    </article>
  )

  return href ? <Link href={href}>{body}</Link> : body
}

function getContentHref(itemType: TrendingItem["itemType"], slug: string) {
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

function formatItemType(itemType: TrendingItem["itemType"]) {
  return itemType.toLowerCase().replaceAll("_", " ")
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
