"use client"

import Image from "next/image"

import { FileText, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { WithSkeletonLink } from "@/hoc/with-skeleton-link"

export type CollectionCardData = {
  id: string
  title: string
  description: string
  count: string
  rating: string
  reviews: string
  price: string
  discount?: string
  href: string
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

function CollectionCardInner({
  collection,
  imageSizes = "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw",
}: CollectionCardInnerProps) {
  return (
    <article className="learning-glass flex h-full flex-col rounded-lg p-2 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:bg-card/86">
      {/* Cover Image */}
      <div
        className="relative w-full overflow-hidden rounded-md border border-border/60 bg-muted"
        style={{ aspectRatio: "304/171" }}
      >
        {collection?.thumbnailUrl ? (
          <Image
            fill
            src={collection.thumbnailUrl}
            alt={collection.title}
            className="object-cover transition-opacity duration-300 group-hover:opacity-90"
            sizes={imageSizes}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText className="size-10 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="flex w-full flex-1 flex-col gap-1 px-2 pt-3 pb-4">
        {/* Title */}
        <h3 className="text-body line-clamp-2 leading-tight font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
          {collection?.title || "Collection Title"}
        </h3>

        {/* Author */}
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {collection?.author?.name || "Buddy Expert"}
        </p>

        {/* Rating */}
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-sm font-bold text-amber-700 dark:text-amber-500">
            {collection?.rating || "—"}
          </span>
          <div className="flex items-center gap-px">
            {[1, 2, 3, 4, 5].map((star) => {
              const ratingNum = Number(collection?.rating || 0)
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
            ({collection?.reviews || "0"})
          </span>
        </div>

        {/* Meta */}
        <div className="text-3xs flex items-center gap-1 text-muted-foreground">
          <span>{collection?.count || "—"}</span>
          <span className="opacity-50">•</span>
          <span className="line-clamp-1">Collection</span>
        </div>

        {/* Pricing Row */}
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          {collection?.discount ? (
            <>
              <span className="text-base font-bold text-foreground">
                {collection.discount}
              </span>
              <span className="text-caption text-muted-foreground line-through">
                {collection.price}
              </span>
            </>
          ) : (
            <span className="text-base font-bold text-foreground">
              {collection?.price || "—"}
            </span>
          )}
        </div>

        {/* Bestseller Badge */}
        {collection?.discount && (
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

export const CollectionCard = WithSkeletonLink(
  CollectionCardInner,
  "collection-card",
  (props) => props.collection?.href
)
