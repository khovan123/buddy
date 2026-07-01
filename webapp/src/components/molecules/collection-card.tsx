"use client"

import Image from "next/image"
import Link from "next/link"

import { Skeleton } from "boneyard-js/react"
import { FileText, Layers3, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { PurchasableContentType } from "@/features/billing/services/billing-api"
import { ItemInteractionControls } from "@/features/interaction"
import type {
  InteractionContentType,
  InteractionStats,
} from "@/features/interaction"
import type { WithSkeletonLinkProps } from "@/hoc/with-skeleton-link"
import { useI18n } from "@/i18n/language-provider"
import { cn } from "@/lib/utils"

import type { CardPriceData } from "./card-price"
import { CardPrice } from "./card-price"
import { LearningCardShell, LearningOrbit } from "./learning-card-shell"

export type CollectionCardData = {
  id: string
  title: string
  description: string
  count: string
  rating: string
  reviews: string
  price: string
  pricing?: CardPriceData
  views?: string
  discount?: string
  href: string
  interactionType?: InteractionContentType
  initialStats?: Partial<InteractionStats>
  purchaseType?: PurchasableContentType
  thumbnailUrl?: string
  author?: {
    name: string
    avatar?: string
  }
}

type CollectionCardInnerProps = {
  collection?: CollectionCardData
  imageSizes?: string
}

function buildCheckoutHref(
  href: string,
  itemId: string,
  itemType: PurchasableContentType
) {
  const separator = href.includes("?") ? "&" : "?"
  return `${href}${separator}checkout=resume&itemType=${encodeURIComponent(itemType)}&itemId=${encodeURIComponent(itemId)}`
}

function getBuyLabel(price: string | undefined, t: (key: "billing.purchase.learnNow" | "billing.purchase.seePreview") => string) {
  const normalized = price?.trim().toLowerCase()
  if (!normalized || normalized === "free") {
    return t("billing.purchase.learnNow")
  }

  const numericPrice = Number(normalized.replace(/[^\d.-]/g, ""))
  return Number.isFinite(numericPrice) && numericPrice > 0
    ? t("billing.purchase.seePreview")
    : t("billing.purchase.learnNow")
}

function isPaid(price?: string) {
  const normalized = price?.trim().toLowerCase()
  if (!normalized || normalized === "free") {
    return false
  }

  const numericPrice = Number(normalized.replace(/[^\d.-]/g, ""))
  return Number.isFinite(numericPrice) && numericPrice > 0
}

function CollectionCardInner({
  collection,
  imageSizes = "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw",
}: CollectionCardInnerProps) {
  const { t } = useI18n()
  const ratingNum = Number(collection?.rating || 0)
  const checkoutHref =
    collection?.href && collection.purchaseType
      ? buildCheckoutHref(
          collection.href,
          collection.id,
          collection.purchaseType
        )
      : undefined
  const paid = isPaid(collection?.pricing?.finalPrice ?? collection?.price)

  return (
    <LearningCardShell className="group/collection p-2">
      {collection?.href ? (
        <Link
          href={collection.href}
          className="absolute inset-0 z-20 rounded-[1.35rem] outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={`View ${collection.title}`}
        />
      ) : null}
      <div
        className="relative z-10 w-full overflow-hidden rounded-[1rem] border border-white/10 bg-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
        style={{ aspectRatio: "304/171" }}
      >
        {collection?.thumbnailUrl ? (
          <Image
            fill
            src={collection.thumbnailUrl}
            alt={collection.title}
            className="object-cover transition duration-500 group-hover/collection:scale-105 group-hover/collection:opacity-92"
            sizes={imageSizes}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_28%,color-mix(in_oklch,var(--education-sage)_18%,transparent),transparent_56%)]">
            <FileText className="size-10 text-muted-foreground/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/78 via-background/10 to-transparent" />
        <div className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full border border-white/12 bg-background/72 px-2.5 py-1 text-xs font-bold text-foreground backdrop-blur-md">
          <Layers3 className="size-3.5 text-primary" />
          {collection?.count || "—"}
        </div>
      </div>

      <div className="relative z-10 flex w-full flex-1 flex-col gap-2 px-2 pt-4 pb-3">
        <div className="text-3xs flex items-center justify-between gap-3 font-bold tracking-[0.16em] text-muted-foreground uppercase">
          <span>Collection</span>
          <CardPrice price={collection?.price} pricing={collection?.pricing} compact />
        </div>

        <h3 className="text-body line-clamp-2 leading-tight font-bold tracking-tight text-foreground transition-colors group-hover/collection:text-primary">
          {collection?.title || "Collection Title"}
        </h3>

        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {collection?.author?.name || "Buddy Expert"}
        </p>

        <p className="line-clamp-1 text-xs text-muted-foreground">
          {paid
            ? t("card.collection.paidHint")
            : t("card.collection.freeHint")}
        </p>

        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-sm font-bold text-education-gold">
            {collection?.rating || "—"}
          </span>
          <div className="flex items-center gap-px">
            {[1, 2, 3, 4, 5].map((star) => {
              const isFull = star <= ratingNum
              const isHalf = !isFull && star - 0.5 <= ratingNum
              return (
                <Star
                  key={star}
                  className={`size-3.5 ${isFull ? "fill-education-gold text-education-gold" : isHalf ? "fill-education-gold/50 text-education-gold" : "fill-muted text-muted"}`}
                />
              )
            })}
          </div>
          <span className="text-3xs leading-none text-muted-foreground">
            ({collection?.reviews || "0"})
          </span>
        </div>

        <div className="relative z-30 mt-auto flex flex-col gap-2 pt-3">
          <div className="min-w-0">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[72%] animate-[pulse_3.2s_ease-in-out_infinite] rounded-full bg-primary/65" />
            </div>
          </div>
          {collection?.discount ? (
            <Badge className="rounded-full border border-education-gold/25 bg-education-gold/18 px-2.5 font-sans text-xs font-bold text-foreground shadow-none hover:bg-education-gold/22">
              Bundle value
            </Badge>
          ) : null}
          {collection?.interactionType ? (
            <ItemInteractionControls
              itemId={collection.id}
              itemType={collection.interactionType}
              initialStats={collection.initialStats}
              buyHref={checkoutHref}
              buyLabel={getBuyLabel(collection.pricing?.finalPrice ?? collection.price, t)}
              compact
            />
          ) : null}
        </div>
      </div>
      <LearningOrbit active className="size-24 opacity-35" />
    </LearningCardShell>
  )
}

export function CollectionCard({
  isLoading = false,
  onClick,
  className,
  ...rest
}: CollectionCardInnerProps & WithSkeletonLinkProps) {
  return (
    <Skeleton
      name="collection-card"
      loading={isLoading}
      className="flex h-full flex-col items-stretch rounded-3xl *:data-boneyard-content:flex *:data-boneyard-content:h-full *:data-boneyard-content:min-h-0 *:data-boneyard-content:flex-1 *:data-boneyard-content:items-stretch [&>[data-boneyard-content]>*]:flex-1"
    >
      <div
        onClick={onClick}
        className={cn(
          "group flex h-full min-h-0 w-full flex-1 flex-col self-stretch overflow-hidden",
          className
        )}
      >
        <CollectionCardInner {...rest} />
      </div>
    </Skeleton>
  )
}
