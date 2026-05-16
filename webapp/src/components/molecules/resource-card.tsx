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
    <article className="flex h-full flex-col">
      {/* Cover Image */}
      <div
        className="relative w-full overflow-hidden rounded-xl border border-border/50 bg-muted"
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
      <div className="flex w-full flex-col gap-1 pt-2 pb-4">
        {/* Title */}
        <h3 className="line-clamp-2 text-body leading-tight font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
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
        <p className="mt-0.5 line-clamp-1 text-3xs text-muted-foreground">
          {resource?.category || "Category"}
        </p>

        {/* Pricing Row */}
        {!resource?.owned && (
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-base font-bold text-foreground">
              {resource?.price || "—"}
            </span>
          </div>
        )}

        {/* Bestseller Badge */}
        {resource?.bestseller && (
          <div className="mt-1">
            <Badge className="w-fit rounded-sm border-none bg-[#eceb98] px-2.5 py-0.5 font-sans text-xs font-bold text-[#3d3c0a] shadow-none hover:bg-[#eceb98]">
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
