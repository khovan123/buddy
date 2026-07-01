"use client"

import Link from "next/link"

import { SectionHeading } from "@/components/atoms/section-heading"
import { CollectionCard } from "@/components/molecules/collection-card"
import { ResourceCard } from "@/components/molecules/resource-card"
import { TutorialCard } from "@/components/molecules/tutorial-card"
import type {
  CollectionQueryItem,
  ResourceQueryItem,
  TrendingItem,
  TutorialQueryItem,
} from "@/features/content/types"
import { useI18n } from "@/i18n/language-provider"

import {
  mapCollectionToCard,
  mapResourceToCard,
  mapTutorialToCard,
} from "../mappers"

interface TrendingSectionContentProps {
  items: TrendingItem[]
}

export function TrendingSectionContent({
  items,
}: TrendingSectionContentProps) {
  const { t } = useI18n()

  return (
    <section className="space-y-5 rounded-2xl border border-border/80 bg-card/40 p-6">
      <SectionHeading
        badge={t("trending.badge")}
        title={t("trending.title")}
        description={t("trending.description")}
      />
      <div className="grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((rec) => {
          const itemType = rec.itemType
          const content = rec.content

          if (!content) {
            return (
              <TrendingFallbackCard
                key={rec.itemId}
                title={rec.display?.title || t("trending.fallbackTitle")}
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
  const { t } = useI18n()
  const href = slug ? getContentHref(itemType, slug) : undefined
  const body = (
    <article className="flex h-full min-h-40 flex-col justify-between rounded-lg border border-border/80 bg-card p-4 shadow-sm transition hover:border-primary/40">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>{formatItemType(itemType)}</span>
          <span>
            {t("trending.interactions", {
              count: String(totalInteractions),
            })}
          </span>
        </div>
        <h3 className="line-clamp-2 text-base font-semibold text-foreground">
          {title}
        </h3>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        {avgRating > 0
          ? t("trending.averageRating", { rating: avgRating.toFixed(1) })
          : t("trending.thisWeek")}
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
