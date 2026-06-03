"use client"

import Image from "next/image"

import { FileText, ShieldCheck, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { WithSkeletonLink } from "@/hoc/with-skeleton-link"

import { LearningCardShell, LearningOrbit } from "./learning-card-shell"

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
  const ratingNum = Number(resource?.rating || 0)

  return (
    <LearningCardShell className="group/resource p-2">
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
        <div className="flex items-center justify-between gap-3 text-3xs font-bold tracking-[0.16em] text-muted-foreground uppercase">
          <span className="line-clamp-1">{resource?.category || "Category"}</span>
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

        <div className="mt-auto pt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[58%] animate-[pulse_3s_ease-in-out_infinite] rounded-full bg-primary/65" />
          </div>
        </div>
      </div>
      <LearningOrbit active className="size-24 opacity-35" />
    </LearningCardShell>
  )
}

export const ResourceCard = WithSkeletonLink(
  ResourceCardInner,
  "resource-card",
  (props) => props.resource?.href
)
