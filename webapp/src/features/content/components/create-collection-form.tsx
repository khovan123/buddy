"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { useRouter, useSearchParams } from "next/navigation"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  ListOrderedIcon,
  ListVideoIcon,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/molecules/confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useCollectionBuilder } from "@/features/content/hooks/useCollectionBuilder"
import {
  useCreateCollectionMutation,
  useGetCollectionByIdQuery,
  useGetContentMetaQuery,
  useGetCoursesByMajorQuery,
  useUpdateCollectionMutation,
} from "@/features/content/services/content-api"
import {
  fetchResourcesByCourse,
  fetchTutorialsByCourse,
} from "@/features/content/services/content.client"
import {
  CollectionType,
  type ResourceQueryItem,
  type TutorialQueryItem,
} from "@/features/content/types"
import { extractApiError } from "@/types/api"

import { CollectionFormValues, collectionSchema } from "../schema"
import {
  toLearningFitFormValues,
  toLearningFitPayload,
} from "../utils/learning-fit"
import { trackLearningFitEvent } from "../utils/learning-fit-events"
import { getFriendlyContentError } from "../utils/user-facing-content"

import {
  CollectionRoadmapBuilder,
  type PhaseItem,
  type RoadmapPhase,
} from "./collection-roadmap-builder"
import { FitEditor } from "./fit-editor"
import { ResourceExplorer } from "./resource-explorer"
import { ThumbnailPicker } from "./thumbnail-picker"

// ── Field-to-Tab mapping for error auto-navigation ──────────
const FIELD_TAB_MAP: Record<string, string> = {
  title: "info",
  description: "info",
  hightlights: "info",
  thumbnailFile: "info",
  thumbnailBase64: "info",
  type: "mapping",
  resourceIds: "mapping",
  tutorialIds: "mapping",
  phases: "mapping",
  majorId: "pricing",
  courseId: "pricing",
  discount: "pricing",
  learningFit: "info",
}

// ── Main Form ────────────────────────────────────────────────────
export function CreateCollectionForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("edit") || undefined
  const isEditMode = Boolean(editId)
  const [createCollection, { isLoading }] = useCreateCollectionMutation()
  const [updateCollection, { isLoading: isUpdating }] =
    useUpdateCollectionMutation()

  // ── Mode & Tab state ──────────────────────────────────────
  const [mode, setMode] = useState<"minimal" | "advanced">("minimal")
  const [activeTab, setActiveTab] = useState("info")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingSubmitData, setPendingSubmitData] =
    useState<CollectionFormValues | null>(null)

  // Available content for explorer
  const [availableResources, setAvailableResources] = useState<
    ResourceQueryItem[]
  >([])
  const [isLoadingResources, setIsLoadingResources] = useState(false)
  const [availableTutorials, setAvailableTutorials] = useState<
    TutorialQueryItem[]
  >([])
  const [isLoadingTutorials, setIsLoadingTutorials] = useState(false)

  // Roadmap phases state (for TUTORIAL type, managed outside RHF for DND)
  const [roadmapPhases, setRoadmapPhases] = useState<RoadmapPhase[]>([
    {
      id: `phase-${crypto.randomUUID()}`,
      phaseTitle: "Getting Started",
      learningGoal: "",
      items: [],
    },
  ])

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      title: "",
      description: "",
      hightlights: [{ value: "" }],
      majorId: "",
      courseId: "",
      type: CollectionType.RESOURCE,
      discount: 0,
      resourceIds: [],
      tutorialIds: [],
      phases: [],
      learningFit: toLearningFitFormValues(),
    },
  })

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form

  const { fields, append, remove } = useFieldArray({
    control,
    name: "hightlights",
  })

  // Watch for cascading dropdowns & type switching
  const selectedMajorId = useWatch({ name: "majorId", control })
  const selectedCourseId = useWatch({ name: "courseId", control })
  const selectedType = useWatch({ name: "type", control })
  const thumbnailBase64 = useWatch({ name: "thumbnailBase64", control })
  const watchedTitle = useWatch({ name: "title", control })
  const watchedDescription = useWatch({ name: "description", control })
  const watchedHighlights = useWatch({ name: "hightlights", control }) || []

  // RTK Query: Majors & Courses
  const { data: metaData, isLoading: isLoadingMajors } =
    useGetContentMetaQuery()
  const majors = metaData?.data?.majors ?? []

  const { data: coursesData, isLoading: isLoadingCourses } =
    useGetCoursesByMajorQuery(selectedMajorId, { skip: !selectedMajorId })
  const courses = coursesData?.data ?? []
  const { data: editingCollectionResponse } = useGetCollectionByIdQuery(
    editId!,
    { skip: !editId }
  )

  useEffect(() => {
    const collection = editingCollectionResponse?.data
    if (!collection) {
      return
    }

    const phases =
      collection.phases?.map((phase) => ({
        id: `phase-${crypto.randomUUID()}`,
        phaseTitle: phase.phaseTitle,
        learningGoal: phase.learningGoal,
        items: phase.items.map((item) => ({
          id: `pi-${crypto.randomUUID()}-${item.itemId}`,
          itemId: item.itemId,
          itemType: item.itemType as "RESOURCE" | "TUTORIAL",
        })),
      })) ?? []

    form.reset({
      title: collection.title,
      description: collection.description,
      hightlights: collection.hightlights.map((value) => ({ value })),
      majorId: collection.majorId,
      courseId: collection.courseId,
      type: collection.type,
      discount: collection.discount,
      resourceIds: [],
      tutorialIds: [],
      thumbnailBase64: "",
      learningFit: toLearningFitFormValues(collection.learningFit),
      phases: phases.map((phase) => ({
        id: phase.id,
        phaseTitle: phase.phaseTitle,
        learningGoal: phase.learningGoal,
        items: phase.items.map((item) => ({
          id: item.id,
          itemId: item.itemId,
          itemType: item.itemType as "RESOURCE" | "TUTORIAL",
        })),
      })),
    })
    queueMicrotask(() => setRoadmapPhases(phases))
  }, [editingCollectionResponse, form])

  // ── Collection Builder hook (for Explorer filtering) ──────────
  const currentAvailable = useMemo(
    () =>
      selectedType === CollectionType.RESOURCE
        ? availableResources
        : availableTutorials,
    [selectedType, availableResources, availableTutorials]
  )

  const builder = useCollectionBuilder({ availableItems: currentAvailable })

  const isLoadingContent =
    selectedType === CollectionType.RESOURCE
      ? isLoadingResources
      : isLoadingTutorials

  // ── Error-to-tab auto-navigation (called on validation failure) ──
  const onInvalid = useCallback(
    (fieldErrors: Record<string, unknown>) => {
      if (mode !== "advanced") {
        return
      }
      for (const key of Object.keys(fieldErrors)) {
        const tab = FIELD_TAB_MAP[key]
        if (tab) {
          setActiveTab(tab)
          break
        }
      }
    },
    [mode]
  )

  // ── Track selected items (for explorer "already added" state) ──
  const isItemSelected = useCallback(
    (id: string) => {
      // Both TUTORIAL and RESOURCE types now use roadmap phases
      return roadmapPhases.some((p) =>
        p.items.some((item) => item.itemId === id)
      )
    },
    [roadmapPhases]
  )

  // ── Sync roadmapPhases to react-hook-form ─────────────────────
  useEffect(() => {
    const formPhases = roadmapPhases.map((p) => ({
      id: p.id,
      phaseTitle: p.phaseTitle,
      learningGoal: p.learningGoal,
      items: p.items.map((item) => ({
        id: item.id,
        itemId: item.itemId,
        itemType: item.itemType as "RESOURCE" | "TUTORIAL",
      })),
    }))
    setValue("phases", formPhases, { shouldValidate: true })
  }, [roadmapPhases, setValue])

  // ── Add item handlers ─────────────────────────────────────────

  const handleAddToRoadmap = useCallback(
    (id: string) => {
      setRoadmapPhases((prev) => {
        // Prevent duplicates across all phases
        const alreadyExists = prev.some((p) =>
          p.items.some((i) => i.itemId === id)
        )
        if (alreadyExists) {
          return prev
        }

        const newItem: PhaseItem = {
          id: `pi-${crypto.randomUUID()}-${id}`,
          itemId: id,
          itemType: selectedType,
        }

        if (prev.length === 0) {
          return [
            {
              id: `phase-${crypto.randomUUID()}`,
              phaseTitle: "Phase 1",
              learningGoal: "",
              items: [newItem],
            },
          ]
        }

        // Must deep copy the last phase to avoid mutating original state
        const next = [...prev]
        const lastPhaseIndex = next.length - 1
        const lastPhase = { ...next[lastPhaseIndex] }
        lastPhase.items = [...lastPhase.items, newItem]
        next[lastPhaseIndex] = lastPhase
        return next
      })
    },
    [selectedType]
  )

  // Thumbnail handler is now inline in the Controller below
  const inferType = builder.inferContentType

  // ── Form Submission ───────────────────────────────────────────
  const onSubmit = async (data: CollectionFormValues) => {
    try {
      // Exclude thumbnailFile from backend request payload
      const { thumbnailFile: _, ...restData } = data
      const learningFit = toLearningFitPayload(restData.learningFit)
      const payload = {
        ...restData,
        hightlights: restData.hightlights.map((h) => h.value),
        learningFit,
        // Backend derives resourceIds and tutorialIds natively from phases
        resourceIds: undefined,
        tutorialIds: undefined,
        phases: data.phases?.length
          ? data.phases.map((p) => ({
              phaseTitle: p.phaseTitle,
              learningGoal: p.learningGoal,
              items: p.items.map((item) => ({
                itemId: item.itemId,
                itemType: item.itemType,
              })),
            }))
          : undefined,
      }

      if (isEditMode && editId) {
        await updateCollection({ id: editId, body: payload }).unwrap()
        if (learningFit) {
          trackLearningFitEvent("fit_editor_completed", {
            contentType: "collection",
            mode: "update",
            fitStatus: learningFit.fitStatus,
          })
        }
        toast.success("Collection updated.")
        router.refresh()
      } else {
        await createCollection(payload).unwrap()
        if (learningFit) {
          trackLearningFitEvent("fit_editor_completed", {
            contentType: "collection",
            mode: "create",
            fitStatus: learningFit.fitStatus,
          })
        }
        toast.success("Collection created.")
        form.reset()
        setRoadmapPhases([])
      }
    } catch (error: unknown) {
      const message = getFriendlyContentError(
        error,
        `We could not ${isEditMode ? "update" : "create"} this collection. Please review the form and try again.`
      )
      toast.error(message)
      console.error(
        `Failed to ${isEditMode ? "update" : "create"} collection:`,
        {
          message,
          rawMessage: extractApiError(error),
        }
      )
    }
  }

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    void handleSubmit((data) => {
      setPendingSubmitData(data)
      setConfirmOpen(true)
    }, onInvalid)(event)
  }

  // ── Section Renderers ─────────────────────────────────────

  const infoSection = (
    <div className="space-y-4">
      <Field>
        <Label htmlFor="collection-title">Title</Label>
        <Input
          id="collection-title"
          {...form.register("title")}
          placeholder="e.g. Calculus Master Collection"
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </Field>

      <Field>
        <Label htmlFor="collection-description">Description</Label>
        <Textarea
          id="collection-description"
          {...form.register("description")}
          placeholder="Describe what this collection contains..."
          className="min-h-32"
        />
        {errors.description && (
          <p className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <Label htmlFor="collection-discount">Bundle Discount (%)</Label>
          <Input
            id="collection-discount"
            type="number"
            {...form.register("discount", { valueAsNumber: true })}
          />
          {errors.discount && (
            <p className="text-sm text-destructive">
              {errors.discount.message}
            </p>
          )}
        </Field>
      </div>

      {/* Highlights Dynamic Array */}
      <div className="space-y-4 border-t border-border/50 pt-4">
        <h3 className="text-lg font-semibold tracking-tight">Key Highlights</h3>
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-start gap-2">
            <div className="w-full space-y-1">
              <Input
                {...form.register(`hightlights.${index}.value` as const)}
                placeholder={`Highlight #${index + 1}`}
              />
              {errors.hightlights?.[index]?.value && (
                <p className="text-sm text-destructive">
                  {errors.hightlights[index]?.value?.message}
                </p>
              )}
            </div>
            {fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}
        {errors.hightlights?.root && (
          <p className="text-sm text-destructive">
            {errors.hightlights.root.message}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ value: "" })}
          className="rounded-xl border-dashed"
        >
          <Plus className="mr-2 size-4" /> Add Highlight
        </Button>
      </div>
    </div>
  )

  const packagingSection = (
    <div className="space-y-4">
      {/* ── Type Selector at the top of this tab ── */}
      <div className="space-y-2">
        <Label>Collection Type</Label>
        <Select
          value={selectedType}
          onValueChange={(val) => {
            // Reset all content state when switching type
            setValue("resourceIds", [], { shouldValidate: false })
            setValue("tutorialIds", [], { shouldValidate: false })
            setValue("phases", [], { shouldValidate: false })
            setRoadmapPhases([])
            builder.clearAll()
            const newType = val as CollectionType
            setValue("type", newType, { shouldValidate: true })

            if (selectedCourseId) {
              if (newType === CollectionType.RESOURCE) {
                setIsLoadingResources(true)
                fetchResourcesByCourse(selectedCourseId)
                  .then(setAvailableResources)
                  .finally(() => setIsLoadingResources(false))
              } else {
                setIsLoadingTutorials(true)
                fetchTutorialsByCourse(selectedCourseId)
                  .then(setAvailableTutorials)
                  .finally(() => setIsLoadingTutorials(false))
              }
            }
          }}
        >
          <SelectTrigger className="w-full rounded-xl">
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CollectionType.RESOURCE}>
              <ListOrderedIcon /> Resource Collection
            </SelectItem>
            <SelectItem value={CollectionType.TUTORIAL}>
              <ListVideoIcon /> Tutorial Roadmap
            </SelectItem>
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-sm text-destructive">{errors.type.message}</p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-6 border-t border-border/50 pt-4 md:grid-cols-2">
        <Field>
          <Label>Major</Label>
          <Select
            value={selectedMajorId}
            onValueChange={(val) => {
              setValue("majorId", val, { shouldValidate: true })
              setValue("courseId", "")
              setAvailableResources([])
              setAvailableTutorials([])
              setValue("resourceIds", [], { shouldValidate: false })
              setValue("tutorialIds", [], { shouldValidate: false })
              setValue("phases", [], { shouldValidate: false })
              setRoadmapPhases([])
              builder.clearAll()
            }}
          >
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue
                placeholder={
                  isLoadingMajors ? "Loading Majors..." : "Select Major..."
                }
              />
            </SelectTrigger>
            <SelectContent>
              {majors.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.majorId && (
            <p className="text-sm text-destructive">{errors.majorId.message}</p>
          )}
        </Field>
        <Field>
          <Label>Course</Label>
          <Select
            value={selectedCourseId}
            onValueChange={(val) => {
              setValue("courseId", val, { shouldValidate: true })
              setValue("resourceIds", [], { shouldValidate: false })
              setValue("tutorialIds", [], { shouldValidate: false })
              setValue("phases", [], { shouldValidate: false })
              setRoadmapPhases([])
              builder.clearAll()

              if (val) {
                if (selectedType === CollectionType.RESOURCE) {
                  setIsLoadingResources(true)
                  fetchResourcesByCourse(val)
                    .then(setAvailableResources)
                    .finally(() => setIsLoadingResources(false))
                } else {
                  setIsLoadingTutorials(true)
                  fetchTutorialsByCourse(val)
                    .then(setAvailableTutorials)
                    .finally(() => setIsLoadingTutorials(false))
                }
              } else {
                setAvailableResources([])
                setAvailableTutorials([])
              }
            }}
            disabled={!selectedMajorId}
          >
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue
                placeholder={
                  isLoadingCourses ? "Loading Options..." : "Select Course..."
                }
              />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.courseId && (
            <p className="text-sm text-destructive">
              {errors.courseId.message}
            </p>
          )}
        </Field>
      </div>

      {/* ── Content Builder ── */}
      <div className="space-y-4 border-t border-border/50 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="flex gap-2 text-lg font-semibold tracking-tight">
            {selectedType === CollectionType.RESOURCE ? (
              <>
                <ListOrderedIcon /> Choose resources
              </>
            ) : (
              <>
                <ListVideoIcon /> Tutorial path
              </>
            )}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedType === CollectionType.RESOURCE
            ? "Browse and add resources to your collection."
            : "Organize tutorials into clear steps learners can follow."}
        </p>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* ── Left column: Explorer (shared) ── */}
          <ResourceExplorer
            items={builder.filteredAvailableItems}
            searchQuery={builder.searchQuery}
            filterType={builder.filterType}
            onSearchChange={builder.setSearch}
            onFilterChange={builder.setFilter}
            onAddItem={handleAddToRoadmap}
            isSelected={isItemSelected}
            inferContentType={inferType}
            isLoading={isLoadingContent}
            hasSelectedCourse={!!selectedCourseId}
          />

          {/* ── Right column: Type-agnostic builder ── */}
          <CollectionRoadmapBuilder
            phases={roadmapPhases}
            onChange={setRoadmapPhases}
            availableContent={currentAvailable}
            inferType={inferType}
            collectionType={selectedType}
          />
        </div>

        {/* Validation errors */}
        {errors.resourceIds && (
          <p className="text-sm text-destructive">
            {errors.resourceIds.message}
          </p>
        )}
        {errors.phases && (
          <p className="text-sm text-destructive">
            {errors.phases?.message || "Please check the phases."}
          </p>
        )}
      </div>
    </div>
  )

  const mediaSection = (
    <div className="space-y-6">
      <Controller
        control={control}
        name="thumbnailFile"
        render={({ field, fieldState }) => (
          <div className="space-y-2">
            <Label>Thumbnail</Label>
            <ThumbnailPicker
              value={field.value || thumbnailBase64 || null}
              onChange={(file) => {
                field.onChange(file)
                if (!file) {
                  setValue("thumbnailBase64", "", { shouldValidate: true })
                  return
                }
                const reader = new FileReader()
                reader.onload = (event) => {
                  if (typeof event.target?.result === "string") {
                    setValue("thumbnailBase64", event.target.result, {
                      shouldValidate: true,
                    })
                  }
                }
                reader.readAsDataURL(file)
              }}
              labelContext="Collection"
              error={fieldState.error?.message}
            />
          </div>
        )}
      />
    </div>
  )

  return (
    <Card className="mx-auto max-w-5xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {isEditMode ? "Update collection" : "Create collection"}
            </CardTitle>
            <CardDescription>
              {isEditMode
                ? "Update the details, cover image, course, and learning path."
                : selectedType === CollectionType.RESOURCE
                  ? "Group resources so learners can follow them together."
                  : "Organize tutorials into a clear learning path."}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Label
              htmlFor="collection-mode-switch"
              className="text-sm text-muted-foreground"
            >
              Advanced
            </Label>
            <Switch
              id="collection-mode-switch"
              checked={mode === "advanced"}
              onCheckedChange={(checked) =>
                setMode(checked ? "advanced" : "minimal")
              }
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleFormSubmit} className="space-y-8">
          {mode === "minimal" ? (
            /* ── Minimal Mode: All sections sequential ───── */
            <div className="space-y-10">
              <div>
                <h3 className="mb-4 text-lg font-semibold tracking-tight">
                  Details
                </h3>
                {infoSection}
              </div>
              <FitEditor
                control={control}
                register={form.register}
                setValue={form.setValue}
                draftContext={{
                  contentType: "COLLECTION",
                  title: watchedTitle,
                  description: watchedDescription,
                  hightlights: watchedHighlights.map((item) => item.value),
                  phases: roadmapPhases.map((phase) => ({
                    phaseTitle: phase.phaseTitle,
                    learningGoal: phase.learningGoal,
                    items: phase.items,
                  })),
                  majorId: selectedMajorId,
                  courseId: selectedCourseId,
                }}
              />
              <Separator />
              <div>
                <h3 className="mb-4 text-lg font-semibold tracking-tight">
                  Cover
                </h3>
                {mediaSection}
              </div>
              <Separator />
              <div>
                <h3 className="mb-4 text-lg font-semibold tracking-tight">
                  Learning path
                </h3>
                {packagingSection}
              </div>
            </div>
          ) : (
            /* ── Advanced Mode: Tabbed interface ──────── */
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="mb-8 grid w-full grid-cols-3 rounded-xl bg-muted/50 p-1">
                <TabsTrigger value="info" className="rounded-lg">
                  Details
                </TabsTrigger>
                <TabsTrigger value="pricing" className="rounded-lg">
                  Cover
                </TabsTrigger>
                <TabsTrigger value="mapping" className="rounded-lg">
                  Learning path
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="info"
                className="mt-0 animate-in space-y-6 fade-in slide-in-from-bottom-2"
              >
                {infoSection}
                <FitEditor
                  control={control}
                  register={form.register}
                  setValue={form.setValue}
                  draftContext={{
                    contentType: "COLLECTION",
                    title: watchedTitle,
                    description: watchedDescription,
                    hightlights: watchedHighlights.map((item) => item.value),
                    phases: roadmapPhases.map((phase) => ({
                      phaseTitle: phase.phaseTitle,
                      learningGoal: phase.learningGoal,
                      items: phase.items,
                    })),
                    majorId: selectedMajorId,
                    courseId: selectedCourseId,
                  }}
                />
              </TabsContent>

              <TabsContent
                value="mapping"
                className="mt-0 animate-in space-y-6 fade-in slide-in-from-bottom-2"
              >
                {packagingSection}
              </TabsContent>

              <TabsContent
                value="pricing"
                className="mt-0 animate-in space-y-6 fade-in slide-in-from-bottom-2"
              >
                {mediaSection}
              </TabsContent>
            </Tabs>
          )}

          <Button
            type="submit"
            disabled={isLoading || isUpdating}
            className="h-12 w-full rounded-xl bg-linear-to-r from-primary to-accent font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            {(isLoading || isUpdating) && (
              <Loader2 className="mr-2 size-5 animate-spin" />
            )}
            {isEditMode
              ? isUpdating
                ? "Updating collection..."
                : "Update collection"
              : isLoading
                ? "Creating collection..."
                : "Create collection"}
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            variant={isEditMode ? "warning" : "confirm"}
            title={
              isEditMode ? "Update this collection?" : "Create this collection?"
            }
            description={
              isEditMode
                ? "Your collection details and learning path will be saved."
                : "The collection will be created from the items you selected."
            }
            confirmLabel={
              isEditMode ? "Update collection" : "Create collection"
            }
            loading={isLoading || isUpdating}
            onConfirm={async () => {
              if (!pendingSubmitData) {
                return
              }
              await onSubmit(pendingSubmitData)
              setPendingSubmitData(null)
            }}
          />
        </form>
      </CardContent>
    </Card>
  )
}
