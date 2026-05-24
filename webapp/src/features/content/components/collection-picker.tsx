"use client"

import Image from "next/image"

import { CheckCircle, Loader2, Package } from "lucide-react"

import type { CollectionQueryItem } from "@/features/content/types"

// ── Collection Picker ───────────────────────────────────────────
// Displays available Resource Collections as selectable cards.
// Single-select (radio-style) with visual highlight.
// Used by the Tutorial Builder's "Pick from Collections" mode.

interface CollectionPickerProps {
  collections: CollectionQueryItem[]
  selectedId: string | undefined
  onSelect: (id: string) => void
  isLoading: boolean
  helperText?: string
  emptyTitle?: string
  emptyDescription?: string
}

export function CollectionPicker({
  collections,
  selectedId,
  onSelect,
  isLoading,
  helperText = "Select a Resource Collection to attach to this tutorial.",
  emptyTitle = "No Resource Collections found",
  emptyDescription = "Create a Resource Collection first, then come back here.",
}: CollectionPickerProps) {
  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center rounded-xl border border-dashed">
        <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Loading collections...
        </span>
      </div>
    )
  }

  if (collections.length === 0) {
    return (
      <div className="flex h-60 flex-col items-center justify-center rounded-xl border border-dashed border-border/60">
        <Package className="mb-3 size-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">
          {emptyTitle}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          {emptyDescription}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{helperText}</p>
      <div className="max-h-100 space-y-2 overflow-y-auto">
        {collections.map((collection) => {
          const isSelected = selectedId === collection.id
          return (
            <button
              key={collection.id}
              type="button"
              onClick={() => onSelect(collection.id)}
              className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              {/* Thumbnail or icon */}
              {collection.thumbnailUrl ? (
                <Image
                  src={collection.thumbnailUrl}
                  alt={collection.title}
                  width={48}
                  height={48}
                  className="size-12 shrink-0 rounded-lg border object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Package className="size-5 text-muted-foreground" />
                </div>
              )}

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{collection.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {collection.description || "No description"}
                </p>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {collection._count?.resources || 0} resource
                    {(collection._count?.resources || 0) !== 1 && "s"}
                  </span>
                  {collection.discount > 0 && (
                    <span className="text-green-600">
                      {collection.discount}% discount
                    </span>
                  )}
                </div>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <CheckCircle className="mt-1 size-5 shrink-0 text-primary" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
