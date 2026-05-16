"use client"

import { useMemo } from "react"

import { Check, FileText, Plus, Search, Video } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import type {
  ContentItem,
  FilterType,
} from "@/features/content/hooks/useCollectionBuilder"

// ── Filter Config ───────────────────────────────────────────────
const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "video", label: "Video" },
  { value: "pdf", label: "PDF" },
  { value: "quiz", label: "Quiz" },
]

// ── ResourceCard ────────────────────────────────────────────────
interface ResourceCardProps {
  item: ContentItem
  isSelected: boolean
  onAdd?: (id: string) => void
  onRemove?: (id: string) => void
  inferType: (item: ContentItem) => "video" | "pdf" | "quiz" | "other"
  variant?: "default" | "borderless"
}

export function ResourceCard({
  item,
  isSelected,
  onAdd,
  onRemove,
  inferType,
  variant = "default",
}: ResourceCardProps) {
  const contentType = inferType(item)
  const fileCount =
    "resourceMeta" in item._count
      ? (item._count as { resourceMeta: number }).resourceMeta
      : 1

  return (
    <div
      className={`group relative flex w-full items-start gap-3 overflow-hidden rounded-xl p-3 text-left transition-all duration-200 ${
        variant === "default"
          ? "border border-border bg-card hover:border-primary/40 hover:bg-accent/30 hover:shadow-md hover:shadow-primary/5"
          : "bg-transparent hover:bg-accent/20"
      } ${
        isSelected && !onRemove
          ? "border-primary/30 bg-primary/5 opacity-60"
          : ""
      }`}
    >
      {/* Thumbnail placeholder */}
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className={`flex size-11 shrink-0 cursor-zoom-in items-center justify-center rounded-lg hover:opacity-80 ${contentType === "video" ? "bg-primary/10 text-primary" : ""} ${contentType === "pdf" ? "bg-accent/15 text-accent" : ""} ${contentType === "quiz" ? "bg-warning/15 text-warning" : ""} ${contentType === "other" ? "bg-muted text-muted-foreground" : ""} `}
          >
            {contentType === "video" ? (
              <Video className="size-5" />
            ) : (
              <FileText className="size-5" />
            )}
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{item.title}</DialogTitle>
            <DialogDescription>
              Type: {contentType} • Files: {fileCount}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-balance text-muted-foreground">
              Preview for {item.title}. In a full implementation, you would load
              media here.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {item.title}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <Badge
            variant="secondary"
            className="text-2xs tracking-wider uppercase"
          >
            {contentType}
          </Badge>
          <span className="text-3xs text-muted-foreground">
            {fileCount} {fileCount === 1 ? "file" : "files"}
          </span>
        </div>
      </div>

      {/* Action indicator */}
      <div className="flex shrink-0 items-center gap-2 self-center">
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onRemove(item.id)}
          >
            &times;
          </Button>
        )}
        {onAdd && (
          <button
            type="button"
            disabled={isSelected}
            onClick={() => onAdd(item.id)}
            className="rounded-full"
          >
            {isSelected ? (
              <div className="flex size-7 items-center justify-center rounded-full bg-primary/15">
                <Check className="size-3.5 text-primary" />
              </div>
            ) : (
              <div className="flex size-7 items-center justify-center rounded-full border border-border bg-background transition-all duration-200 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                <Plus className="size-3.5" />
              </div>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// ── ResourceExplorer (Main Export) ──────────────────────────────
interface ResourceExplorerProps {
  items: ContentItem[]
  searchQuery: string
  filterType: FilterType
  onSearchChange: (q: string) => void
  onFilterChange: (f: FilterType) => void
  onAddItem: (id: string) => void
  isSelected: (id: string) => boolean
  inferContentType: (item: ContentItem) => "video" | "pdf" | "quiz" | "other"
  isLoading: boolean
  hasSelectedCourse: boolean
  renderItemCard?: (
    item: ContentItem,
    isSelected: boolean,
    onAdd: (id: string) => void
  ) => React.ReactNode
}

export function ResourceExplorer({
  items,
  searchQuery,
  filterType,
  onSearchChange,
  onFilterChange,
  onAddItem,
  isSelected,
  inferContentType,
  isLoading,
  hasSelectedCourse,
  renderItemCard,
}: ResourceExplorerProps) {
  const selectedCount = useMemo(
    () => items.filter((item) => isSelected(item.id)).length,
    [items, isSelected]
  )

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card/50">
      {/* Header */}
      <div className="space-y-3 border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold tracking-tight text-foreground">
            Available Content
          </h4>
          {items.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {items.length - selectedCount} remaining
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onFilterChange(opt.value)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150 ${
                filterType === opt.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              } `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable List */}
      <div
        className="flex-1 space-y-2 overflow-y-auto p-3"
        style={{ maxHeight: "420px" }}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner className="size-6 text-primary" />
            <p className="mt-3 text-xs text-muted-foreground">
              Loading content
            </p>
          </div>
        ) : !hasSelectedCourse ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="mb-3 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Select a course to browse available content
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-3 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No content found matching your criteria
            </p>
          </div>
        ) : (
          items.map((item) =>
            renderItemCard ? (
              renderItemCard(item, isSelected(item.id), onAddItem)
            ) : (
              <ResourceCard
                key={item.id}
                item={item}
                isSelected={isSelected(item.id)}
                inferType={inferContentType}
                onAdd={onAddItem}
              />
            )
          )
        )}
      </div>
    </div>
  )
}
