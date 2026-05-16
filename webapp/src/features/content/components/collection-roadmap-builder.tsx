"use client"

import React, { useState } from "react"

import {
  closestCorners,
  defaultDropAnimationSideEffects,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
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
import {
  ChevronDown,
  ChevronUp,
  FileText,
  GripVertical,
  HelpCircle,
  Milestone,
  PlayCircle,
  Plus,
  Trash2,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { ContentItem } from "@/features/content/hooks/useCollectionBuilder"

// ── Types ───────────────────────────────────────────────────────
export interface PhaseItem {
  id: string // unique DND key (phaseId-itemId-uuid)
  itemId: string // actual resource/tutorial ID
  itemType: "RESOURCE" | "TUTORIAL"
}

export interface RoadmapPhase {
  id: string
  phaseTitle: string
  learningGoal: string
  items: PhaseItem[]
}

// ── Sortable Phase ──────────────────────────────────────────────
interface SortablePhaseProps {
  phase: RoadmapPhase
  index: number
  totalPhases: number
  onTitleChange: (v: string) => void
  onGoalChange: (v: string) => void
  onRemovePhase: () => void
  children: React.ReactNode
}

function SortablePhase({
  phase,
  index,
  totalPhases,
  onTitleChange,
  onGoalChange,
  onRemovePhase,
  children,
}: SortablePhaseProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: phase.id,
    data: { type: "Phase", phase },
  })

  const [isCollapsed, setIsCollapsed] = useState(false)
  const itemCount = phase.items.length

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.25 }}
      className="relative"
    >
      {/* Timeline connector (line + dot) */}
      <div className="absolute top-0 -left-6 flex h-full w-6 flex-col items-center">
        {/* Dot */}
        <motion.div
          className={`z-10 flex size-5 items-center justify-center rounded-full border-2 shadow-sm transition-colors ${
            isOver || isDragging
              ? "border-primary bg-primary text-primary-foreground"
              : "border-primary bg-background text-dot font-bold text-primary"
          }`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 * index, type: "spring", stiffness: 300 }}
        >
          {index + 1}
        </motion.div>
        {/* Vertical line */}
        {index < totalPhases - 1 && (
          <motion.div
            className="w-0.5 flex-1 bg-linear-to-b from-primary/40 to-primary/10"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 0.15 * index, duration: 0.3 }}
            style={{ transformOrigin: "top" }}
          />
        )}
      </div>

      {/* Phase card */}
      <Card
        className={`group mb-4 ml-3 overflow-hidden rounded-xl shadow-sm transition-all ${
          isDragging
            ? "border-2 border-dashed border-primary/50 bg-muted/10 opacity-20"
            : isOver
              ? "border-2 border-l-4 border-primary border-l-primary bg-background/60 shadow-md ring-2 ring-primary/20"
              : "border border-l-4 border-border/40 border-l-primary bg-background/40 hover:bg-background/80"
        }`}
      >
        {/* ── Phase Inner Layout ── Single padding source ── */}
        <div className="flex flex-col gap-y-5 px-6">
          {/* Block 1: Meta & Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab text-muted-foreground/40 transition-colors hover:text-foreground"
              >
                <GripVertical className="size-5" />
              </div>
              <span className="font-mono text-xs font-semibold tracking-wider text-primary/70 uppercase">
                Phase {index + 1}
              </span>
            </div>

            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Badge
                variant="outline"
                className="pointer-events-none bg-transparent font-normal text-muted-foreground"
              >
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </Badge>
              <div className="mx-1 h-4 w-px bg-border/60" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="size-8 p-0 text-muted-foreground hover:bg-muted"
              >
                {isCollapsed ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronUp className="size-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemovePhase}
                className="size-8 p-0 text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          {/* Block 2: Content Identity (Title + Description) */}
          <div className="flex flex-col gap-y-1">
            <Input
              value={phase.phaseTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="e.g. Fundamentals"
              className="h-auto rounded-none border-0 bg-transparent p-0 text-xl font-extrabold shadow-none placeholder:opacity-50 focus-visible:ring-0"
            />
          </div>
        </div>

        {/* ── Expandable Content ── */}
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-y-4 px-6">
                {/* Description */}
                <Input
                  value={phase.learningGoal}
                  onChange={(e) => onGoalChange(e.target.value)}
                  placeholder="Describe the learning goal for this phase..."
                  className="h-auto rounded-none border-0 bg-transparent p-0 text-sm text-muted-foreground shadow-none placeholder:opacity-50 focus-visible:ring-0"
                />

                {/* Separator */}
                <div className="h-px bg-border/40" />

                {/* Resource list */}
                <div className="pb-2">{children}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

// ── Sortable Phase Item ─────────────────────────────────────────
interface SortablePhaseItemProps {
  phaseItem: PhaseItem
  contentItem?: ContentItem
  inferType: (item: ContentItem) => "video" | "pdf" | "quiz" | "other"
  onRemove: () => void
}

function SortablePhaseItem({
  phaseItem,
  contentItem,
  inferType,
  onRemove,
}: SortablePhaseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: phaseItem.id,
    data: { type: "PhaseItem", phaseItem },
  })

  // Same strategy: avoid full opacity shifts on the wrapper, handle on inner
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  if (!contentItem) {
    return null
  }

  let TypeIcon = FileText
  const type = inferType(contentItem)
  if (type === "video") {
    TypeIcon = PlayCircle
  }
  if (type === "quiz") {
    TypeIcon = HelpCircle
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`group flex items-center justify-between rounded-md px-2 py-1.5 transition-colors ${
        isDragging
          ? "border-2 border-dashed border-primary/50 bg-muted/10 opacity-20"
          : isOver
            ? "border-b-2 border-b-primary bg-accent/20"
            : "hover:bg-accent/50"
      }`}
    >
      {/* Left group: Handle + Icon + Text */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab text-muted-foreground/30 transition-colors hover:text-foreground"
        >
          <GripVertical className="size-4" />
        </div>
        <TypeIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">
          {contentItem.title}
        </span>
      </div>

      {/* Right group: Actions */}
      <div className="flex shrink-0 items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="size-6 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
    </motion.div>
  )
}

// ── Main Roadmap Builder ────────────────────────────────────────
interface RoadmapBuilderProps {
  phases: RoadmapPhase[]
  onChange: (phases: RoadmapPhase[]) => void
  availableContent: ContentItem[]
  inferType: (item: ContentItem) => "video" | "pdf" | "quiz" | "other"
  collectionType: "RESOURCE" | "TUTORIAL"
}

export function CollectionRoadmapBuilder({
  phases,
  onChange,
  availableContent,
  inferType,
  collectionType,
}: RoadmapBuilderProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleAddPhase = () => {
    onChange([
      ...phases,
      {
        id: `phase-${crypto.randomUUID()}`,
        phaseTitle: "",
        learningGoal: "",
        items: [],
      },
    ])
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) {
      return
    }

    const activeId = active.id
    const overId = over.id
    if (activeId === overId) {
      return
    }

    const isActivePhaseItem = active.data.current?.type === "PhaseItem"
    const isOverPhase = over.data.current?.type === "Phase"
    const isOverPhaseItem = over.data.current?.type === "PhaseItem"

    // Handle external explorer drops separately in DragEnd
    if (active.data.current?.type === "ExplorerItem") {
      return
    }

    if (!isActivePhaseItem) {
      return
    }

    // Reordering items within/between phases
    const activePhaseIndex = phases.findIndex((p) =>
      p.items.some((item) => item.id === activeId)
    )
    const overPhaseIndex = isOverPhase
      ? phases.findIndex((p) => p.id === overId)
      : phases.findIndex((p) => p.items.some((item) => item.id === overId))

    if (activePhaseIndex === -1 || overPhaseIndex === -1) {
      return
    }

    if (activePhaseIndex !== overPhaseIndex) {
      // Moving item between phases
      const newPhases = [...phases]
      const sourcePhase = { ...newPhases[activePhaseIndex] }
      sourcePhase.items = [...sourcePhase.items]

      const targetPhase = { ...newPhases[overPhaseIndex] }
      targetPhase.items = [...targetPhase.items]

      const activeItemIndex = sourcePhase.items.findIndex(
        (item) => item.id === activeId
      )
      const overItemIndex = isOverPhaseItem
        ? targetPhase.items.findIndex((item) => item.id === overId)
        : targetPhase.items.length

      const [movedItem] = sourcePhase.items.splice(activeItemIndex, 1)
      targetPhase.items.splice(overItemIndex, 0, movedItem)

      newPhases[activePhaseIndex] = sourcePhase
      newPhases[overPhaseIndex] = targetPhase

      onChange(newPhases)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) {
      return
    }

    // 1. Handle external explorer item drops
    if (active.data.current?.type === "ExplorerItem") {
      const item = active.data.current.item as ContentItem

      // Prevent duplicates
      const alreadyExists = phases.some((p) =>
        p.items.some((i) => i.itemId === item.id)
      )
      if (alreadyExists) {
        return
      }

      let targetPhaseIndex = phases.length - 1 // default to last phase

      if (over.data.current?.type === "Phase") {
        targetPhaseIndex = phases.findIndex((p) => p.id === over.id)
      } else if (over.data.current?.type === "PhaseItem") {
        targetPhaseIndex = phases.findIndex((p) =>
          p.items.some((i) => i.id === over.id)
        )
      }

      const newPhases = [...phases]

      if (targetPhaseIndex === -1 || newPhases.length === 0) {
        if (newPhases.length === 0) {
          targetPhaseIndex = 0
          newPhases.push({
            id: `phase-${crypto.randomUUID()}`,
            phaseTitle: "Phase 1",
            learningGoal: "",
            items: [],
          })
        } else {
          // Fallback if over phase not found
          targetPhaseIndex = newPhases.length - 1
        }
      }

      // Deep copy the target phase to avoid mutation
      const targetPhase = { ...newPhases[targetPhaseIndex] }
      targetPhase.items = [
        ...targetPhase.items,
        {
          id: `pi-${crypto.randomUUID()}-${item.id}`,
          itemId: item.id,
          itemType: collectionType,
        },
      ]
      newPhases[targetPhaseIndex] = targetPhase

      onChange(newPhases)
      return
    }

    if (active.id === over.id) {
      return
    }

    // 2. Reordering Phases
    if (
      active.data.current?.type === "Phase" &&
      over.data.current?.type === "Phase"
    ) {
      const oldIndex = phases.findIndex((p) => p.id === active.id)
      const newIndex = phases.findIndex((p) => p.id === over.id)
      onChange(arrayMove(phases, oldIndex, newIndex))
      return
    }

    // 3. Reordering items inside the same phase
    if (
      active.data.current?.type === "PhaseItem" &&
      over.data.current?.type === "PhaseItem"
    ) {
      const activePhaseIndex = phases.findIndex((p) =>
        p.items.some((i) => i.id === active.id)
      )
      const overPhaseIndex = phases.findIndex((p) =>
        p.items.some((i) => i.id === over.id)
      )

      if (activePhaseIndex === overPhaseIndex && activePhaseIndex !== -1) {
        const phaseIndex = activePhaseIndex
        const oldIndex = phases[phaseIndex].items.findIndex(
          (i) => i.id === active.id
        )
        const newIndex = phases[phaseIndex].items.findIndex(
          (i) => i.id === over.id
        )

        const newPhases = [...phases]
        const modifiedPhase = { ...newPhases[phaseIndex] }
        modifiedPhase.items = arrayMove(modifiedPhase.items, oldIndex, newIndex)

        newPhases[phaseIndex] = modifiedPhase
        onChange(newPhases)
      }
    }
  }

  // Find the active dragged item for the overlay
  const getActiveItem = () => {
    if (!activeId) {
      return null
    }
    for (const phase of phases) {
      const item = phase.items.find((i) => i.id === activeId)
      if (item) {
        return {
          phaseItem: item,
          meta: availableContent.find((c) => c.id === item.itemId),
        }
      }
    }
    return null
  }

  const totalItems = phases.reduce((acc, p) => acc + p.items.length, 0)

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card/30">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h4 className="flex items-center gap-2 font-semibold tracking-tight">
            <Milestone className="size-4 text-primary" />
            Roadmap Builder
          </h4>
          <p className="text-xs text-muted-foreground">
            {phases.length} phase{phases.length !== 1 && "s"} · {totalItems}{" "}
            item{totalItems !== 1 && "s"}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleAddPhase}
          className="rounded-full"
        >
          <Plus className="mr-2 size-4" /> Add Phase
        </Button>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto p-4 pl-10"
        style={{ maxHeight: "600px" }}
      >
        {phases.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border/60">
            <Milestone className="mb-3 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No phases added yet.
            </p>
            <Button type="button" variant="link" onClick={handleAddPhase}>
              Create the first phase
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={phases.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <AnimatePresence mode="popLayout">
                {phases.map((phase, pIdx) => (
                  <SortablePhase
                    key={phase.id}
                    phase={phase}
                    index={pIdx}
                    totalPhases={phases.length}
                    onTitleChange={(v) => {
                      const next = [...phases]
                      next[pIdx].phaseTitle = v
                      onChange(next)
                    }}
                    onGoalChange={(v) => {
                      const next = [...phases]
                      next[pIdx].learningGoal = v
                      onChange(next)
                    }}
                    onRemovePhase={() => {
                      onChange(phases.filter((p) => p.id !== phase.id))
                    }}
                  >
                    <SortableContext
                      items={phase.items.map((i) => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1">
                        <AnimatePresence mode="popLayout">
                          {phase.items.map((phaseItem) => (
                            <SortablePhaseItem
                              key={phaseItem.id}
                              phaseItem={phaseItem}
                              contentItem={availableContent.find(
                                (c) => c.id === phaseItem.itemId
                              )}
                              inferType={inferType}
                              onRemove={() => {
                                const next = [...phases]
                                next[pIdx].items = next[pIdx].items.filter(
                                  (i) => i.id !== phaseItem.id
                                )
                                onChange(next)
                              }}
                            />
                          ))}
                        </AnimatePresence>

                        {/* Thin Dropzone / Add Content separator */}
                        <div className="group/add relative mt-2 flex items-center justify-center py-2">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-dashed border-border/40" />
                          </div>
                          <div className="relative flex justify-center">
                            <span className="bg-background px-2 text-2xs tracking-wider text-muted-foreground/50 uppercase transition-colors group-hover/add:text-muted-foreground">
                              Drop resources here
                            </span>
                          </div>
                        </div>
                      </div>
                    </SortableContext>
                  </SortablePhase>
                ))}
              </AnimatePresence>
            </SortableContext>

            {/* Drag Overlay */}
            <DragOverlay
              dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                  styles: { active: { opacity: "0.5" } },
                }),
              }}
              className="z-50 cursor-grabbing"
            >
              {(() => {
                const activeItem = getActiveItem()
                if (activeId && activeItem && activeItem.meta) {
                  const type = inferType(activeItem.meta)
                  return (
                    <div className="flex w-80 max-w-[90vw] rotate-2 cursor-grabbing items-center gap-3 rounded-md border border-primary bg-background/90 px-3 py-2 shadow-2xl backdrop-blur-md sm:w-100">
                      <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
                      {type === "video" ? (
                        <PlayCircle className="size-4 shrink-0 text-muted-foreground" />
                      ) : type === "quiz" ? (
                        <HelpCircle className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="flex-1 truncate text-sm font-medium">
                        {activeItem.meta.title}
                      </div>
                    </div>
                  )
                }
                const activePhase = phases.find((p) => p.id === activeId)
                if (activeId && activePhase) {
                  return (
                    <Card className="w-full rotate-2 cursor-grabbing overflow-hidden rounded-xl border-primary bg-background/80 shadow-2xl backdrop-blur-md">
                      <CardHeader className="flex flex-row items-center justify-between border-b-0 bg-transparent p-4 pb-2">
                        <div className="flex items-center gap-3">
                          <GripVertical className="size-5 text-muted-foreground/40" />
                          <div className="text-base font-semibold">
                            {activePhase.phaseTitle || "Untitled Phase"}
                          </div>
                          <Badge
                            variant="secondary"
                            className="pointer-events-none ml-2 bg-muted/50 text-xs font-normal text-muted-foreground"
                          >
                            {activePhase.items.length}{" "}
                            {activePhase.items.length === 1 ? "item" : "items"}
                          </Badge>
                        </div>
                      </CardHeader>
                      {activePhase.learningGoal && (
                        <CardContent className="p-4 pt-0">
                          <div className="mb-4 pl-8 text-sm text-muted-foreground">
                            {activePhase.learningGoal}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  )
                }
                return null
              })()}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  )
}
