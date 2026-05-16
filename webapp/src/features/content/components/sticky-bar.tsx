"use client"

import { FileText, Layers } from "lucide-react"

// ── StickyBar ───────────────────────────────────────────────────
interface StickyBarProps {
  totalCount: number
  totalFileCount: number
}

export function StickyBar({ totalCount, totalFileCount }: StickyBarProps) {
  if (totalCount === 0) {
    return null
  }

  return (
    <div className="sticky bottom-0 z-10 mt-4 flex items-center justify-between rounded-xl border border-primary/20 bg-card/80 px-5 py-3 backdrop-blur-md">
      <div className="flex items-center gap-5">
        {/* Item count */}
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
            <Layers className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {totalCount} {totalCount === 1 ? "item" : "items"}
            </p>
            <p className="text-3xs text-muted-foreground">selected</p>
          </div>
        </div>

        {/* File count */}
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-accent/10">
            <FileText className="size-3.5 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {totalFileCount} {totalFileCount === 1 ? "file" : "files"}
            </p>
            <p className="text-3xs text-muted-foreground">total</p>
          </div>
        </div>
      </div>

      {/* Visual indicator */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: Math.min(totalCount, 5) }).map((_, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            className="size-1.5 rounded-full bg-primary"
            style={{ opacity: 1 - i * 0.15 }}
          />
        ))}
        {totalCount > 5 && (
          <span className="ml-1 text-2xs text-muted-foreground">
            +{totalCount - 5}
          </span>
        )}
      </div>
    </div>
  )
}
