"use client"

import Image from "next/image"

import { Play, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { WithSkeletonLink } from "@/hoc/with-skeleton-link"

export type TutorialCardData = {
  id: string
  category: string
  title: string
  duration: string
  level: string
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

type TutorialCardInnerProps = {
  tutorial?: TutorialCardData
  imageSizes?: string
}

function TutorialCardInner({
  tutorial,
  imageSizes = "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw",
}: TutorialCardInnerProps) {
  return (
    <article className="flex h-full flex-col">
      {/* Cover Image */}
      <div
        className="relative w-full overflow-hidden rounded-xl border border-border/50 bg-muted"
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
      <div className="flex w-full flex-col gap-1 pt-2 pb-4">
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
        <div className="mt-1 flex items-baseline gap-2">
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

        {/* Bestseller Badge */}
        {tutorial?.discount && (
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

export const TutorialCard = WithSkeletonLink(
  TutorialCardInner,
  "tutorial-card",
  (props) => props.tutorial?.href
)
