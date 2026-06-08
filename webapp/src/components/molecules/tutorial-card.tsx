"use client"

import Image from "next/image"
import Link from "next/link"

import { Skeleton } from "boneyard-js/react"
import { Play, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { PurchasableContentType } from "@/features/billing/services/billing-api"
import { ItemInteractionControls } from "@/features/interaction"
import type {
  InteractionContentType,
  InteractionStats,
} from "@/features/interaction"
import type { WithSkeletonLinkProps } from "@/hoc/with-skeleton-link"
import { cn } from "@/lib/utils"

export type TutorialCardData = {
  id: string
  category: string
  title: string
  duration: string
  level: string
  rating: string
  reviews: string
  price: string
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

type TutorialCardInnerProps = {
  tutorial?: TutorialCardData
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

function TutorialCardInner({
  tutorial,
  imageSizes = "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw",
}: TutorialCardInnerProps) {
  const checkoutHref =
    tutorial?.href && tutorial.purchaseType
      ? buildCheckoutHref(tutorial.href, tutorial.id, tutorial.purchaseType)
      : undefined

  return (
    <article className="learning-glass relative flex h-full flex-col rounded-lg p-2 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:bg-card/86">
      {tutorial?.href ? (
        <Link
          href={tutorial.href}
          className="absolute inset-0 z-20 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={`View ${tutorial.title}`}
        />
      ) : null}
      {/* Cover Image */}
      <div
        className="relative w-full overflow-hidden rounded-md border border-border/60 bg-muted"
        style={{ aspectRatio: "304/171" }}
      >
        {tutorial?.thumbnailUrl ? (
          <Image
            fill
            src={tutorial.thumbnailUrl}
            alt={tutorial.title}
            className="object-cover transition-opacity duration-300 group-hover:opacity-90"
            sizes={imageSizes}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="size-10 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="flex w-full flex-1 flex-col gap-1 px-2 pt-3 pb-4">
        {/* Title */}
        <h3 className="text-body line-clamp-2 leading-tight font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
          {tutorial?.title || "Tutorial Title"}
        </h3>

        {/* Author */}
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {tutorial?.author?.name || "Unibuddy Expert"}
        </p>

        {/* Rating */}
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-sm font-bold text-amber-700 dark:text-amber-500">
            {tutorial?.rating || "—"}
          </span>
          <div className="flex items-center gap-px">
            {[1, 2, 3, 4, 5].map((star) => {
              const ratingNum = Number(tutorial?.rating || 0)
              const isFull = star <= ratingNum
              const isHalf = !isFull && star - 0.5 <= ratingNum
              return (
                <Star
                  key={star}
                  className={`size-3.5 ${isFull ? "fill-amber-400 text-amber-400" : isHalf ? "fill-amber-400/50 text-amber-400" : "fill-muted text-muted"}`}
                />
              )
            })}
          </div>
          <span className="text-3xs leading-none text-muted-foreground">
            ({tutorial?.reviews || "0"})
          </span>
        </div>

        {/* Specs / Meta */}
        <div className="text-3xs flex items-center gap-1 text-muted-foreground">
          <span>{tutorial?.duration || "—"}</span>
          <span className="opacity-50">•</span>
          <span>{tutorial?.level || "—"}</span>
          <span className="opacity-50">•</span>
          <span className="line-clamp-1">
            {tutorial?.category || "Category"}
          </span>
        </div>

        {/* Pricing Row */}
        <div className="relative z-30 mt-auto flex flex-col gap-2 pt-2">
          <div className="flex min-w-0 flex-col">
            {tutorial?.discount ? (
              <>
                <span className="text-base font-bold text-foreground">
                  {tutorial.discount}
                </span>
                <span className="text-caption text-muted-foreground line-through">
                  {tutorial.price}
                </span>
              </>
            ) : (
              <span className="text-base font-bold text-foreground">
                {tutorial?.price || "—"}
              </span>
            )}
          </div>
          {tutorial?.interactionType ? (
            <ItemInteractionControls
              itemId={tutorial.id}
              itemType={tutorial.interactionType}
              initialStats={tutorial.initialStats}
              buyHref={checkoutHref}
              buyLabel={`Buy ${tutorial.title}`}
              compact
            />
          ) : null}
        </div>

        {/* Bestseller Badge */}
        {tutorial?.discount && (
          <div className="mt-1">
            <Badge className="w-fit rounded-full border border-accent/30 bg-accent/30 px-2.5 py-0.5 font-sans text-xs font-bold text-accent-foreground shadow-none hover:bg-accent/40">
              Bestseller
            </Badge>
          </div>
        )}
      </div>
    </article>
  )
}

export function TutorialCard({
  isLoading = false,
  onClick,
  className,
  ...rest
}: TutorialCardInnerProps & WithSkeletonLinkProps) {
  return (
    <Skeleton
      name="tutorial-card"
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
        <TutorialCardInner {...rest} />
      </div>
    </Skeleton>
  )
}
