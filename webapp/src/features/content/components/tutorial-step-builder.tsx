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
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ContentItem } from "@/features/content/hooks/useCollectionBuilder"

// ── Types ───────────────────────────────────────────────────────
export interface StepResource {
  id: string // unique combination like stepId-resourceId for dnd
  resourceId: string
  instructionNote: string
}

export interface TutorialStep {
  id: string
  title: string
  resources: StepResource[]
}

// ── Sortable Step ───────────────────────────────────────────────
interface SortableStepProps {
  step: TutorialStep
  index: number
  totalSteps: number
  onTitleChange: (v: string) => void
  onRemoveStep: () => void
  children: React.ReactNode
}

function SortableStep({
  step,
  index,
  totalSteps,
  onTitleChange,
  onRemoveStep,
  children,
}: SortableStepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: step.id,
    data: { type: "Step", step },
  })

  const [isCollapsed, setIsCollapsed] = useState(false)
  const itemCount = step.resources.length

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
        {index < totalSteps - 1 && (
          <motion.div
            className="w-0.5 flex-1 bg-linear-to-b from-primary/40 to-primary/10"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 0.15 * index, duration: 0.3 }}
            style={{ transformOrigin: "top" }}
          />
        )}
      </div>

      {/* Step card */}
      <Card
        className={`group mb-4 ml-3 overflow-hidden rounded-xl shadow-sm transition-all ${
          isDragging
            ? "border-2 border-dashed border-primary/50 bg-muted/10 opacity-20"
            : isOver
              ? "border-2 border-l-4 border-primary border-l-primary bg-background/60 shadow-md ring-2 ring-primary/20"
              : "border border-l-4 border-border/40 border-l-primary bg-background/40 hover:bg-background/80"
        }`}
      >
        {/* ── Step Inner Layout ── Single padding source ── */}
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
                Step {index + 1}
              </span>
            </div>

            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Badge
                variant="outline"
                className="pointer-events-none bg-transparent font-normal text-muted-foreground"
              >
                {itemCount} {itemCount === 1 ? "resource" : "resources"}
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
                onClick={onRemoveStep}
                className="size-8 p-0 text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          {/* Block 2: Content Identity */}
          <div className="flex flex-col gap-y-1">
            <Input
              value={step.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="e.g. Introduction to Variables"
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

// ── Sortable Resource Item ──────────────────────────────────────
interface SortableResourceProps {
  resourceExt: StepResource
  contentItem?: ContentItem
  inferType: (item: ContentItem) => "video" | "pdf" | "quiz" | "other"
  onRemove: () => void
  onNoteChange: (val: string) => void
}

function SortableResource({
  resourceExt,
  contentItem,
  inferType,
  onRemove,
  onNoteChange,
}: SortableResourceProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: resourceExt.id,
    data: { type: "Resource", resource: resourceExt },
  })

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
      className={`group/res flex flex-col gap-y-2 rounded-md transition-colors ${
        isDragging
          ? "border-2 border-dashed border-primary/50 bg-muted/10 opacity-20"
          : isOver
            ? "border-b-2 border-b-primary bg-accent/20"
            : ""
      }`}
    >
      {/* Row: Handle + Icon + Title + Actions */}
      <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50">
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
            className="size-6 text-muted-foreground opacity-0 transition-opacity group-hover/res:opacity-100 hover:text-destructive"
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      {/* Instruction Note */}
      <div className="pr-2 pb-1 pl-11">
        <Textarea
          value={resourceExt.instructionNote}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Add instruction notes for this resource..."
          rows={1}
          className="min-h-8 resize-none rounded-none border-0 bg-transparent p-0 text-xs text-muted-foreground shadow-none placeholder:opacity-50 focus-visible:ring-0"
        />
      </div>
    </motion.div>
  )
}

// ── Main Builder ────────────────────────────────────────────────
interface StepBuilderProps {
  steps: TutorialStep[]
  onChange: (steps: TutorialStep[]) => void
  availableResources: ContentItem[]
  inferType: (item: ContentItem) => "video" | "pdf" | "quiz" | "other"
}

export function TutorialStepBuilder({
  steps,
  onChange,
  availableResources,
  inferType,
}: StepBuilderProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleAddStep = () => {
    onChange([
      ...steps,
      { id: `step-${crypto.randomUUID()}`, title: "", resources: [] },
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

    const isActiveResource = active.data.current?.type === "Resource"
    const isOverStep = over.data.current?.type === "Step"
    const isOverResource = over.data.current?.type === "Resource"

    // If dragging a resource from left column to a step
    if (
      active.data.current?.type === "ExplorerItem" &&
      (isOverStep || isOverResource)
    ) {
      // We handle this in DragEnd to actually insert it.
      return
    }

    if (!isActiveResource) {
      return
    }

    // Reordering resources within/between steps
    const activeStepIndex = steps.findIndex((s) =>
      s.resources.some((r) => r.id === activeId)
    )
    const overStepIndex = isOverStep
      ? steps.findIndex((s) => s.id === overId)
      : steps.findIndex((s) => s.resources.some((r) => r.id === overId))

    if (activeStepIndex === -1 || overStepIndex === -1) {
      return
    }

    if (activeStepIndex !== overStepIndex) {
      // Moved to a different step
      const newSteps = [...steps]
      const activeStep = newSteps[activeStepIndex]
      const overStep = newSteps[overStepIndex]

      const activeItemIndex = activeStep.resources.findIndex(
        (r) => r.id === activeId
      )
      const overItemIndex = isOverResource
        ? overStep.resources.findIndex((r) => r.id === overId)
        : overStep.resources.length

      const [movedResource] = activeStep.resources.splice(activeItemIndex, 1)
      overStep.resources.splice(overItemIndex, 0, movedResource)

      onChange(newSteps)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) {
      return
    }

    // 1. Dragged external ExplorerItem to Steps area
    if (active.data.current?.type === "ExplorerItem") {
      const item = active.data.current.item as ContentItem

      let targetStepIndex = steps.length - 1 // Default to last step

      if (over.data.current?.type === "Step") {
        targetStepIndex = steps.findIndex((s) => s.id === over.id)
      } else if (over.data.current?.type === "Resource") {
        targetStepIndex = steps.findIndex((s) =>
          s.resources.some((r) => r.id === over.id)
        )
      }

      if (targetStepIndex === -1 || steps.length === 0) {
        // Need a step first
        if (steps.length === 0) {
          targetStepIndex = 0
          steps.push({
            id: `step-${crypto.randomUUID()}`,
            title: "Step 1",
            resources: [],
          })
        }
      }

      const newSteps = [...steps]
      newSteps[targetStepIndex].resources.push({
        id: `res-${crypto.randomUUID()}-${item.id}`,
        resourceId: item.id,
        instructionNote: "",
      })
      onChange(newSteps)
      return
    }

    if (active.id === over.id) {
      return
    }

    // 2. Reordering Steps
    if (
      active.data.current?.type === "Step" &&
      over.data.current?.type === "Step"
    ) {
      const oldIndex = steps.findIndex((s) => s.id === active.id)
      const newIndex = steps.findIndex((s) => s.id === over.id)
      onChange(arrayMove(steps, oldIndex, newIndex))
      return
    }

    // 3. Reordering Resources inside the same step
    if (
      active.data.current?.type === "Resource" &&
      over.data.current?.type === "Resource"
    ) {
      const activeStepIndex = steps.findIndex((s) =>
        s.resources.some((r) => r.id === active.id)
      )
      const overStepIndex = steps.findIndex((s) =>
        s.resources.some((r) => r.id === over.id)
      )

      if (activeStepIndex === overStepIndex) {
        const stepIndex = activeStepIndex
        const oldIndex = steps[stepIndex].resources.findIndex(
          (r) => r.id === active.id
        )
        const newIndex = steps[stepIndex].resources.findIndex(
          (r) => r.id === over.id
        )

        const newSteps = [...steps]
        newSteps[stepIndex].resources = arrayMove(
          newSteps[stepIndex].resources,
          oldIndex,
          newIndex
        )
        onChange(newSteps)
      }
    }
  }

  // Find the exact resource being dragged for the Overlay
  const activeResource = () => {
    if (!activeId) {
      return null
    }
    for (const step of steps) {
      const res = step.resources.find((r) => r.id === activeId)
      if (res) {
        return {
          ext: res,
          meta: availableResources.find((r) => r.id === res.resourceId),
        }
      }
    }
    return null
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card/30">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex flex-col gap-y-0.5">
          <div className="flex items-center gap-2">
            <Milestone className="size-4 text-primary" />
            <h4 className="font-semibold tracking-tight">Step Builder</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Organize resources into a learning timeline.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleAddStep}
          className="rounded-full"
        >
          <Plus className="mr-2 size-4" /> Add Step
        </Button>
      </div>

      {/* Content area */}
      <div
        className="flex-1 overflow-y-auto p-4"
        style={{ maxHeight: "600px" }}
      >
        {steps.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-y-2 rounded-xl border border-dashed border-border/60">
            <p className="text-sm text-muted-foreground">No steps added yet.</p>
            <Button type="button" variant="link" onClick={handleAddStep}>
              Create the first step
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
            {/* Timeline container */}
            <div className="relative pl-6">
              <SortableContext
                items={steps.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <AnimatePresence mode="popLayout">
                  {steps.map((step, sIdx) => (
                    <SortableStep
                      key={step.id}
                      step={step}
                      index={sIdx}
                      totalSteps={steps.length}
                      onTitleChange={(v) => {
                        const next = [...steps]
                        next[sIdx].title = v
                        onChange(next)
                      }}
                      onRemoveStep={() => {
                        onChange(steps.filter((s) => s.id !== step.id))
                      }}
                    >
                      <SortableContext
                        items={step.resources.map((r) => r.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-1">
                          <AnimatePresence mode="popLayout">
                            {step.resources.map((res, rIdx) => (
                              <SortableResource
                                key={res.id}
                                resourceExt={res}
                                contentItem={availableResources.find(
                                  (r) => r.id === res.resourceId
                                )}
                                inferType={inferType}
                                onRemove={() => {
                                  const next = [...steps]
                                  next[sIdx].resources = next[
                                    sIdx
                                  ].resources.filter((r) => r.id !== res.id)
                                  onChange(next)
                                }}
                                onNoteChange={(v) => {
                                  const next = [...steps]
                                  next[sIdx].resources[rIdx].instructionNote = v
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
                    </SortableStep>
                  ))}
                </AnimatePresence>
              </SortableContext>
            </div>

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
                const currentResource = activeResource()
                if (activeId && currentResource && currentResource.meta) {
                  const type = inferType(currentResource.meta)
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
                        {currentResource.meta.title}
                      </div>
                    </div>
                  )
                }
                const activeStep = steps.find((s) => s.id === activeId)
                if (activeId && activeStep) {
                  return (
                    <Card className="w-full rotate-2 cursor-grabbing overflow-hidden rounded-xl border-primary bg-background/80 shadow-2xl backdrop-blur-md">
                      <div className="flex flex-col gap-y-3 p-5">
                        <div className="flex items-center gap-3">
                          <GripVertical className="size-5 text-muted-foreground/40" />
                          <div className="text-base font-semibold">
                            {activeStep.title || "Untitled Step"}
                          </div>
                          <Badge
                            variant="secondary"
                            className="pointer-events-none ml-2 bg-muted/50 text-xs font-normal text-muted-foreground"
                          >
                            {activeStep.resources.length}{" "}
                            {activeStep.resources.length === 1
                              ? "resource"
                              : "resources"}
                          </Badge>
                        </div>
                      </div>
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
