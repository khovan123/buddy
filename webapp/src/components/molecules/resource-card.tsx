"use client"

import Image from "next/image"
import Link from "next/link"

import { Skeleton } from "boneyard-js/react"
import { FileText, ShieldCheck, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { PurchasableContentType } from "@/features/billing/services/billing-api"
import type {
  InteractionContentType,
  InteractionStats,
} from "@/features/interaction"
import { ItemInteractionControls } from "@/features/interaction"
import type { WithSkeletonLinkProps } from "@/hoc/with-skeleton-link"
import { cn } from "@/lib/utils"

import { LearningCardShell, LearningOrbit } from "./learning-card-shell"

export type ResourceCardData = {
  id: string
  category: string
  title: string
  rating: string
  reviews: string
  price: string
  views?: string
  href: string
  interactionType?: InteractionContentType
  initialStats?: Partial<InteractionStats>
  purchaseType?: PurchasableContentType
  thumbnailUrl?: string
  owned?: boolean
  bestseller?: boolean
  author?: {
    name: string
    avatar?: string
  }
}

type ResourceCardInnerProps = {
  resource?: ResourceCardData
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

function getBuyLabel(price?: string) {
  const normalized = price?.trim().toLowerCase()
  if (!normalized || normalized === "free") {
    return "Learn now"
  }

  const numericPrice = Number(normalized.replace(/[^\d.-]/g, ""))
  return Number.isFinite(numericPrice) && numericPrice > 0
    ? "Discovery now"
    : "Learn now"
}

function ResourceCardInner({
  resource,
  imageSizes = "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw",
}: ResourceCardInnerProps) {
  const ratingNum = Number(resource?.rating || 0)
  const checkoutHref =
    resource?.href && resource.purchaseType
      ? buildCheckoutHref(resource.href, resource.id, resource.purchaseType)
      : undefined

  return (
    <LearningCardShell className="group/resource p-2">
      {resource?.href ? (
        <Link
          href={resource.href}
          className="absolute inset-0 z-20 rounded-[1.35rem] outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={`View ${resource.title}`}
        />
      ) : null}
      <div
        className="relative z-10 w-full overflow-hidden rounded-[1rem] border border-white/10 bg-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
        style={{ aspectRatio: "304/171" }}
      >
        {resource?.thumbnailUrl ? (
          <Image
            fill
            src={resource.thumbnailUrl}
            alt={resource.title}
            className="object-cover transition duration-500 group-hover/resource:scale-105 group-hover/resource:opacity-92"
            sizes={imageSizes}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_28%,color-mix(in_oklch,var(--education-sage)_18%,transparent),transparent_56%)]">
            <FileText className="size-10 text-muted-foreground/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/76 via-transparent to-transparent" />
        {resource?.owned && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/48 backdrop-blur-[2px]">
            <Badge className="rounded-full border border-border bg-background/90 px-3 tracking-wide text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              <ShieldCheck className="size-3.5" />
              Owned
            </Badge>
          </div>
        )}
        {resource?.bestseller && !resource?.owned ? (
          <Badge className="absolute top-3 left-3 rounded-full border border-education-gold/25 bg-education-gold/18 px-2.5 font-sans text-xs font-bold text-foreground shadow-none hover:bg-education-gold/22">
            Bestseller
          </Badge>
        ) : null}
      </div>

      <div className="relative z-10 flex w-full flex-1 flex-col gap-2 px-2 pt-4 pb-3">
        <div className="text-3xs flex items-center justify-between gap-3 font-bold tracking-[0.16em] text-muted-foreground uppercase">
          <span className="line-clamp-1">
            {resource?.category || "Category"}
          </span>
          {!resource?.owned ? (
            <span className="rounded-full border border-border/70 bg-background/50 px-2 py-0.5 tracking-normal text-foreground">
              {resource?.price || "—"}
            </span>
          ) : null}
        </div>

        <h3 className="text-body line-clamp-2 leading-tight font-bold tracking-tight text-foreground transition-colors group-hover/resource:text-primary">
          {resource?.title || "Resource Title"}
        </h3>

        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {resource?.author?.name || "Buddy Expert"}
        </p>

        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-sm font-bold text-education-gold">
            {resource?.rating || "—"}
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
            ({resource?.reviews || "0"})
          </span>
        </div>

        <div className="pointer-events-auto relative z-30 mt-auto pt-3">
          {resource?.interactionType ? (
            <ItemInteractionControls
              itemId={resource.id}
              itemType={resource.interactionType}
              initialStats={resource.initialStats}
              buyHref={!resource.owned ? checkoutHref : undefined}
              buyLabel={getBuyLabel(resource.price)}
              compact
            />
          ) : (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[58%] animate-[pulse_3s_ease-in-out_infinite] rounded-full bg-primary/65" />
            </div>
          )}
        </div>
      </div>
      <LearningOrbit active className="size-24 opacity-35" />
    </LearningCardShell>
  )
}

export function ResourceCard({
  isLoading = false,
  onClick,
  className,
  ...rest
}: ResourceCardInnerProps & WithSkeletonLinkProps) {
  return (
    <Skeleton
      name="resource-card"
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
        <ResourceCardInner {...rest} />
      </div>
    </Skeleton>
  )
}
