"use client"

import Image from "next/image"

import { FileText, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { WithSkeletonLink } from "@/hoc/with-skeleton-link"

export type ResourceCardData = {
  id: string
  category: string
  title: string
  rating: string
  reviews: string
  price: string
  href: string
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

function ResourceCardInner({
  resource,
  imageSizes = "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw",
}: ResourceCardInnerProps) {
  return (
    <article className="flex h-full flex-col rounded-3xl border border-border/60 bg-card/70 p-2 shadow-[0_18px_42px_-34px_color-mix(in_oklch,var(--education-ink)_44%,transparent)] transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/25 group-hover:bg-card">
      {/* Cover Image */}
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-border/60 bg-muted"
        style={{ aspectRatio: "304/171" }}
      >
        {resource?.thumbnailUrl ? (
          <Image
            fill
            src={resource.thumbnailUrl}
            alt={resource.title}
            className="object-cover transition-opacity duration-300 group-hover:opacity-90"
            sizes={imageSizes}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText className="size-10 text-muted-foreground/50" />
          </div>
        )}
        {resource?.owned && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
            <Badge className="rounded-md border border-border bg-background/95 tracking-wide text-foreground">
              Owned
            </Badge>
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="flex w-full flex-1 flex-col gap-1 px-2 pt-3 pb-4">
        {/* Title */}
        <h3 className="text-body line-clamp-2 leading-tight font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
          {resource?.title || "Resource Title"}
        </h3>

        {/* Author */}
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {resource?.author?.name || "Buddy Expert"}
        </p>

        {/* Rating */}
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-sm font-bold text-amber-700 dark:text-amber-500">
            {resource?.rating || "—"}
          </span>
          <div className="flex items-center gap-px">
            {[1, 2, 3, 4, 5].map((star) => {
              const ratingNum = Number(resource?.rating || 0)
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
            ({resource?.reviews || "0"})
          </span>
        </div>

        {/* Category */}
        <p className="text-3xs mt-0.5 line-clamp-1 text-muted-foreground">
          {resource?.category || "Category"}
        </p>

        {/* Pricing Row */}
        {!resource?.owned && (
          <div className="mt-auto flex items-baseline gap-2 pt-2">
            <span className="text-base font-bold text-foreground">
              {resource?.price || "—"}
            </span>
          </div>
        )}

        {/* Bestseller Badge */}
        {resource?.bestseller && (
          <div className={resource?.owned ? "mt-auto pt-2" : "mt-1"}>
            <Badge className="w-fit rounded-full border border-accent/30 bg-accent/30 px-2.5 py-0.5 font-sans text-xs font-bold text-accent-foreground shadow-none hover:bg-accent/40">
              Bestseller
            </Badge>
          </div>
        )}
      </div>
    </article>
  )
}

export const ResourceCard = WithSkeletonLink(
  ResourceCardInner,
  "resource-card",
  (props) => props.resource?.href
)
