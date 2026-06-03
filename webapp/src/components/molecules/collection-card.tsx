"use client"

import Image from "next/image"

import { FileText, Layers3, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { WithSkeletonLink } from "@/hoc/with-skeleton-link"

import { LearningCardShell, LearningOrbit } from "./learning-card-shell"

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
  const ratingNum = Number(collection?.rating || 0)

  return (
    <LearningCardShell className="group/collection p-2">
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
        <div className="flex items-center justify-between gap-3 text-3xs font-bold tracking-[0.16em] text-muted-foreground uppercase">
          <span>Collection</span>
          <span className="rounded-full border border-border/70 bg-background/50 px-2 py-0.5 tracking-normal text-foreground">
            {collection?.discount || collection?.price || "—"}
          </span>
        </div>

        <h3 className="text-body line-clamp-2 leading-tight font-bold tracking-tight text-foreground transition-colors group-hover/collection:text-primary">
          {collection?.title || "Collection Title"}
        </h3>

        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {collection?.author?.name || "Buddy Expert"}
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

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div className="min-w-0">
            {collection?.discount ? (
              <span className="text-caption text-muted-foreground line-through">
                {collection.price}
              </span>
            ) : null}
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[72%] animate-[pulse_3.2s_ease-in-out_infinite] rounded-full bg-primary/65" />
            </div>
          </div>
          {collection?.discount ? (
            <Badge className="rounded-full border border-education-gold/25 bg-education-gold/18 px-2.5 font-sans text-xs font-bold text-foreground shadow-none hover:bg-education-gold/22">
              Bundle value
            </Badge>
          ) : null}
        </div>
      </div>
      <LearningOrbit active className="size-24 opacity-35" />
    </LearningCardShell>
  )
}

export const CollectionCard = WithSkeletonLink(
  CollectionCardInner,
  "collection-card",
  (props) => props.collection?.href
)
