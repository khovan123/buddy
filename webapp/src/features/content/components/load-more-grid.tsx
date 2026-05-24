"use client"

import { useCallback, useState, useTransition, type ReactNode } from "react"

import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { PaginationMeta } from "@/types/api"

// ── Generic Load-More Grid ─────────────────────────────────

interface LoadMoreGridProps<T> {
  /** Initial items to display (from SSR) */
  initialItems: T[]
  /** Pagination meta from initial fetch */
  initialMeta: PaginationMeta
  /** Fetch next page — returns { data, meta } */
  fetchMore: (page: number, limit: number) => Promise<{ data: T[]; meta: PaginationMeta }>
  /** Render a single item */
  renderItem: (item: T, index: number) => ReactNode
  /** Key extractor for React list rendering */
  getKey: (item: T) => string
  /** CSS classes for the grid container */
  gridClassName?: string
}

export function LoadMoreGrid<T>({
  initialItems,
  initialMeta,
  fetchMore,
  renderItem,
  getKey,
  gridClassName = "grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3",
}: LoadMoreGridProps<T>) {
  const [items, setItems] = useState<T[]>(initialItems)
  const [meta, setMeta] = useState<PaginationMeta>(initialMeta)
  const [isPending, startTransition] = useTransition()

  const hasMore = meta.page < meta.totalPages

  const loadMore = useCallback(() => {
    if (!hasMore) {return}

    startTransition(async () => {
      try {
        const result = await fetchMore(meta.page + 1, meta.limit)
        setItems((prev) => [...prev, ...result.data])
        setMeta(result.meta)
      } catch {
        // silently fail — user can retry
      }
    })
  }, [meta, hasMore, fetchMore])

  return (
    <>
      <div className={gridClassName}>
        {items.map((item, index) => (
          <div key={getKey(item)} className="h-full">
            {renderItem(item, index)}
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No items found. Check back later!
        </p>
      ) : null}

      {hasMore ? (
        <div className="flex flex-col items-center gap-2 pt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={loadMore}
            className="gap-2"
          >
            {isPending ? <Loader2 className="size-3 animate-spin" /> : null}
            Load More
          </Button>         
        </div>
      ) : null}
    </>
  )
}
