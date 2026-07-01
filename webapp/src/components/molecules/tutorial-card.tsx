"use client"

import Image from "next/image"
import Link from "next/link"

import { Skeleton } from "boneyard-js/react"
import { FileText, Star } from "lucide-react"

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

export type TutorialCardData = {
  id: string
  category: string
  title: string
  duration: string
  level: string
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

function TutorialCardInner({
  tutorial,
  imageSizes = "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw",
}: TutorialCardInnerProps) {
  const { t } = useI18n()
  const ratingNum = Number(tutorial?.rating || 0)
  const checkoutHref =
    tutorial?.href && tutorial.purchaseType
      ? buildCheckoutHref(tutorial.href, tutorial.id, tutorial.purchaseType)
      : undefined
  const paid = isPaid(tutorial?.pricing?.finalPrice ?? tutorial?.price)

  return (
    <LearningCardShell className="group/tutorial p-2">
      {tutorial?.href ? (
        <Link
          href={tutorial.href}
          className="absolute inset-0 z-20 rounded-[1.35rem] outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={`View ${tutorial.title}`}
        />
      ) : null}
      <div
        className="relative z-10 w-full overflow-hidden rounded-[1rem] border border-white/10 bg-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
        style={{ aspectRatio: "304/171" }}
      >
        {tutorial?.thumbnailUrl ? (
          <Image
            fill
            src={tutorial.thumbnailUrl}
            alt={tutorial.title}
            className="object-cover transition duration-500 group-hover/tutorial:scale-105 group-hover/tutorial:opacity-92"
            sizes={imageSizes}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_28%,color-mix(in_oklch,var(--education-sage)_18%,transparent),transparent_56%)]">
            <FileText className="size-10 text-muted-foreground/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/76 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 flex w-full flex-1 flex-col gap-2 px-2 pt-4 pb-3">
        <div className="text-3xs flex items-center justify-between gap-3 font-bold tracking-[0.16em] text-muted-foreground uppercase">
          <span className="line-clamp-1">
            {tutorial?.category || "Category"}
          </span>
          <CardPrice price={tutorial?.price} pricing={tutorial?.pricing} compact />
        </div>

        <h3 className="text-body line-clamp-2 leading-tight font-bold tracking-tight text-foreground transition-colors group-hover/tutorial:text-primary">
          {tutorial?.title || "Tutorial Title"}
        </h3>

        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {tutorial?.author?.name || "Buddy Expert"}
        </p>

        <p className="line-clamp-1 text-xs text-muted-foreground">
          {paid
            ? t("card.tutorial.paidHint")
            : t("card.tutorial.freeHint")}
        </p>

        <div className="text-3xs flex items-center gap-1 text-muted-foreground">
          <span>{tutorial?.duration || "—"}</span>
          <span className="opacity-50">•</span>
          <span>{tutorial?.level || "—"}</span>
        </div>

        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-sm font-bold text-education-gold">
            {tutorial?.rating || "—"}
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
            ({tutorial?.reviews || "0"})
          </span>
        </div>

        <div className="pointer-events-auto relative z-30 mt-auto pt-3">
          {tutorial?.interactionType ? (
            <ItemInteractionControls
              itemId={tutorial.id}
              itemType={tutorial.interactionType}
              initialStats={tutorial.initialStats}
              buyHref={checkoutHref}
              buyLabel={getBuyLabel(tutorial.pricing?.finalPrice ?? tutorial.price, t)}
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
