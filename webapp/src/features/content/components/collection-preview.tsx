"use client"

import { useCallback } from "react"

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Package, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { ContentItem } from "@/features/content/hooks/useCollectionBuilder"

// ── SortableItem ────────────────────────────────────────────────
interface SortableItemProps {
  item: ContentItem
  index: number
  onRemove: (id: string) => void
  inferType: (item: ContentItem) => "video" | "pdf" | "quiz" | "other"
}

function SortableItem({ item, index, onRemove, inferType }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const contentType = inferType(item)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 rounded-xl border p-3 transition-all duration-200 ${
        isDragging
          ? "z-50 border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border bg-card hover:border-primary/20 hover:bg-accent/20"
      } `}
    >
      {/* Order Number */}
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-3xs font-bold text-muted-foreground">
        {index + 1}
      </span>

      {/* Drag Handle */}
      <button
        type="button"
        className="shrink-0 cursor-grab touch-none text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {item.title}
        </p>
      </div>

      {/* Type Badge */}
      <Badge
        variant="outline"
        className="shrink-0 text-2xs tracking-wider uppercase"
      >
        {contentType}
      </Badge>

      {/* Remove Button */}
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-all duration-150 hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

// ── CollectionPreview (Main Export) ─────────────────────────────
interface CollectionPreviewProps {
  selectedItems: ContentItem[]
  selectedIds: string[]
  onRemoveItem: (id: string) => void
  onReorder: (newOrder: string[]) => void
  onClearAll: () => void
  inferContentType: (item: ContentItem) => "video" | "pdf" | "quiz" | "other"
}

export function CollectionPreview({
  selectedItems,
  selectedIds,
  onRemoveItem,
  onReorder,
  onClearAll,
  inferContentType,
}: CollectionPreviewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) {
        return
      }

      const oldIndex = selectedIds.indexOf(String(active.id))
      const newIndex = selectedIds.indexOf(String(over.id))
      const newOrder = arrayMove(selectedIds, oldIndex, newIndex)
      onReorder(newOrder)
    },
    [selectedIds, onReorder]
  )

  const isEmpty = selectedItems.length === 0

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <h4 className="text-sm font-semibold tracking-tight text-foreground">
          Collection Builder
        </h4>
        {!isEmpty && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-muted-foreground transition-colors hover:text-destructive"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Sortable List */}
      <div
        className="flex-1 overflow-y-auto p-3"
        style={{ maxHeight: "420px" }}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/60">
              <Package className="size-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              No items selected yet
            </p>
            <p className="mt-1 max-w-50 text-xs text-muted-foreground/70">
              Click the + button on items in the explorer to add them here
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={selectedIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {selectedItems.map((item, index) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    index={index}
                    onRemove={onRemoveItem}
                    inferType={inferContentType}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}
