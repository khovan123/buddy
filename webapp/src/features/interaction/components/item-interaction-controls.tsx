"use client"

import { useEffect, useMemo, useState } from "react"

import Link from "next/link"

import { Eye, Heart, ShoppingCart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import {
  type InteractionContentType,
  type InteractionStats,
  useGetInteractionStatsQuery,
  useTrackInteractionMutation,
} from "../services/interaction-api"
import {
  ensureInteractionStatsStream,
  INTERACTION_STATS_EVENT,
} from "../services/interaction-stream"

type ItemInteractionControlsProps = {
  itemId: string
  itemType: InteractionContentType
  initialStats?: Partial<InteractionStats>
  buyHref?: string
  buyLabel?: string
  compact?: boolean
  className?: string
}

const numberFormat = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
})

function normalizeStats(
  itemId: string,
  itemType: InteractionContentType,
  stats?: Partial<InteractionStats>
): InteractionStats {
  return {
    itemId,
    itemType,
    viewCount: stats?.viewCount ?? 0,
    likeCount: stats?.likeCount ?? 0,
    purchaseCount: stats?.purchaseCount ?? 0,
    commentCount: stats?.commentCount ?? 0,
    downloadCount: stats?.downloadCount ?? 0,
    ratingCount: stats?.ratingCount ?? 0,
    ratingAverage: stats?.ratingAverage ?? 0,
    likedByCurrentUser: stats?.likedByCurrentUser ?? false,
  }
}

export function ItemInteractionControls({
  itemId,
  itemType,
  initialStats,
  buyHref,
  buyLabel = "Buy",
  compact = false,
  className,
}: ItemInteractionControlsProps) {
  const [liveStats, setLiveStats] = useState<InteractionStats | null>(null)
  const [trackInteraction, { isLoading }] = useTrackInteractionMutation()
  const { data } = useGetInteractionStatsQuery([{ itemId, itemType }])

  const stats =
    liveStats ?? data?.data?.[0] ?? normalizeStats(itemId, itemType, initialStats)

  useEffect(() => {
    ensureInteractionStatsStream()

    function handleStats(event: Event) {
      const nextStats = (event as CustomEvent<InteractionStats>).detail
      if (nextStats.itemId === itemId && nextStats.itemType === itemType) {
        setLiveStats(nextStats)
      }
    }

    globalThis.addEventListener(INTERACTION_STATS_EVENT, handleStats)
    return () => {
      globalThis.removeEventListener(INTERACTION_STATS_EVENT, handleStats)
    }
  }, [itemId, itemType])

  const nextAction = stats.likedByCurrentUser ? "UNLIKE" : "LIKE"
  const likeLabel = stats.likedByCurrentUser ? "Unlike" : "Like"
  const formatted = useMemo(
    () => ({
      views: numberFormat.format(stats.viewCount),
      likes: numberFormat.format(stats.likeCount),
      purchases: numberFormat.format(stats.purchaseCount),
    }),
    [stats.likeCount, stats.purchaseCount, stats.viewCount]
  )

  async function toggleLike() {
    setLiveStats((currentStats) => {
      const current = currentStats ?? stats
      return {
        ...current,
        likedByCurrentUser: !current.likedByCurrentUser,
        likeCount: Math.max(
          current.likeCount + (current.likedByCurrentUser ? -1 : 1),
          0
        ),
      }
    })

    try {
      await trackInteraction({
        itemId,
        itemType,
        action: nextAction,
      }).unwrap()
    } catch {
      setLiveStats((currentStats) => {
        const current = currentStats ?? stats
        return {
          ...current,
          likedByCurrentUser: !current.likedByCurrentUser,
          likeCount: Math.max(
            current.likeCount + (nextAction === "LIKE" ? -1 : 1),
            0
          ),
        }
      })
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground",
        compact ? "flex-wrap" : "flex-wrap sm:gap-3",
        className
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <Eye className="size-3.5" />
        {formatted.views} views
      </span>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className={cn(
          "h-7 px-2 text-xs",
          stats.likedByCurrentUser && "text-destructive hover:text-destructive"
        )}
        onClick={() => void toggleLike()}
        disabled={isLoading}
        aria-label={likeLabel}
      >
        <Heart
          className={cn(
            "size-3.5",
            stats.likedByCurrentUser && "fill-current"
          )}
        />
        {formatted.likes}
      </Button>
      <span className="inline-flex items-center gap-1.5">
        <ShoppingCart className="size-3.5" />
        {formatted.purchases}
      </span>
      {buyHref ? (
        <Button asChild size="sm" className="h-8 px-2.5 text-xs">
          <Link href={buyHref} aria-label={buyLabel}>
            <ShoppingCart className="size-3.5" />
            {buyLabel}
          </Link>
        </Button>
      ) : null}
    </div>
  )
}
