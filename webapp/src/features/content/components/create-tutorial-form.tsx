"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useRouter, useSearchParams } from "next/navigation"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  FileUp,
  LibraryIcon,
  Loader2,
  Plus,
  TableOfContentsIcon,
  Trash2,
} from "lucide-react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
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
import type { ContentItem } from "@/features/content/hooks/useCollectionBuilder"
import {
  useConfirmTutorialUploadMutation,
  useCreateTutorialMutation,
  useGetContentMetaQuery,
  useGetCoursesByMajorQuery,
  useGetTutorialByIdQuery,
  useUpdateTutorialMutation,
} from "@/features/content/services/content-api"
import {
  fetchResourceCollectionsByCourse,
  fetchResourcesByCourse,
} from "@/features/content/services/content.client"
import type {
  CollectionQueryItem,
  ResourceQueryItem,
} from "@/features/content/types"
import { useI18n } from "@/i18n/language-provider"
import { extractApiError } from "@/types/api"

import { TutorialFormValues, tutorialSchema } from "../schema"
import {
  startBatchUpload,
  useUploadStore,
  type UploadBatch,
} from "../store/upload-store"
import {
  TUTORIAL_ALLOWED_FILE_TYPE_COPY,
  TUTORIAL_FILE_ACCEPT,
  isAllowedTutorialFileName,
} from "../utils/tutorial-file-validation"
import { getFriendlyContentError } from "../utils/user-facing-content"

import { CollectionPicker } from "./collection-picker"
import { ResourceExplorer } from "./resource-explorer"
import { TutorialStepBuilder, type TutorialStep } from "./tutorial-step-builder"

// ── Helpers ──────────────────────────────────────────────────

/** Format bytes to human-readable size */
function _formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return "0 B"
  }
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

/**
 * Extract video duration from a File object using a temporary
 * HTML5 video element. Returns duration in seconds.
 */
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video")
    video.preload = "metadata"

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      if (video.duration && isFinite(video.duration)) {
        resolve(Math.round(video.duration))
      } else {
        reject(new Error("Could not determine video duration"))
      }
    }

    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error("Failed to load video metadata"))
    }

    video.src = URL.createObjectURL(file)
  })
}

// ── Field-to-Tab mapping for error auto-navigation ──────────
const FIELD_TAB_MAP: Record<string, string> = {
  title: "metadata",
  description: "metadata",
  hightlights: "metadata",
  fileName: "media",
  fileSizeBytes: "media",
  videoDurationSeconds: "media",
  price: "packaging",
  discountBundle: "packaging",
  majorId: "packaging",
  courseId: "packaging",
  resourceAttachmentMode: "packaging",
  collectionId: "packaging",
  steps: "packaging",
}

export function CreateTutorialForm() {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("edit") || undefined
  const isEditMode = Boolean(editId)
  const [createTutorial, { isLoading }] = useCreateTutorialMutation()
  const [updateTutorial, { isLoading: isUpdating }] =
    useUpdateTutorialMutation()
  const [confirmTutorialUpload] = useConfirmTutorialUploadMutation()

  // ── Mode & Tab state ──────────────────────────────────────
  const [mode, setMode] = useState<"minimal" | "advanced">("minimal")
  const [activeTab, setActiveTab] = useState("metadata")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingSubmitData, setPendingSubmitData] =
    useState<TutorialFormValues | null>(null)

  // Custom states that depend on form changes
  const [resources, setResources] = useState<ResourceQueryItem[]>([])
  const [isLoadingResources, setIsLoadingResources] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<
    "all" | "video" | "pdf" | "quiz"
  >("all")

  // Resource Collections available for "Pick from Collections" mode
  const [resourceCollections, setResourceCollections] = useState<
    CollectionQueryItem[]
  >([])
  const [isLoadingCollections, setIsLoadingCollections] = useState(false)

  // Hidden file input ref for video picker
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Store the actual selected File object for upload
  const selectedFileRef = useRef<File | null>(null)

  // Upload store for background uploads
  const addBatch = useUploadStore((s) => s.addBatch)

  // React Hook Form
  const form = useForm<TutorialFormValues>({
    resolver: zodResolver(tutorialSchema),
    defaultValues: {
      title: "",
      description: "",
      hightlights: [{ value: "" }],
      majorId: "",
      courseId: "",
      price: 0,
      discountBundle: 0,
      fileName: "",
      fileSizeBytes: 0,
      videoDurationSeconds: 0,
      resourceAttachmentMode: "manual",
      collectionId: undefined,
      steps: [],
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

  // Watch for Cascading Dropdowns
  const selectedMajorId = useWatch({ control, name: "majorId" })
  const selectedCourseId = useWatch({ control, name: "courseId" })
  const steps = (useWatch({ control, name: "steps" }) || []) as TutorialStep[]
  const attachmentMode = useWatch({
    control,
    name: "resourceAttachmentMode",
  })
  const selectedCollectionId = useWatch({ control, name: "collectionId" })

  // Watch for File Metadata
  const watchFileName = useWatch({ control, name: "fileName" })
  // const _watchFileSizeBytes = useWatch({ control, name: "fileSizeBytes" })

  // RTK Query: GET Content Metadata (Majors)
  const { data: metaData, isLoading: isLoadingMajors } =
    useGetContentMetaQuery()
  const majors = metaData?.data?.majors ?? []

  // RTK Query: GET Courses based on Selected Major
  const { data: coursesData, isLoading: isLoadingCourses } =
    useGetCoursesByMajorQuery(selectedMajorId, {
      skip: !selectedMajorId,
    })
  const courses = coursesData?.data ?? []
  const { data: editingTutorialResponse } = useGetTutorialByIdQuery(editId!, {
    skip: !editId,
  })

  useEffect(() => {
    const tutorial = editingTutorialResponse?.data
    if (!tutorial) {
      return
    }

    form.reset({
      title: tutorial.title,
      description: tutorial.description,
      hightlights: tutorial.hightlights.map((value) => ({ value })),
      majorId: tutorial.majorId,
      courseId: tutorial.courseId,
      price: tutorial.price,
      discountBundle: tutorial.discountBundle,
      fileName: "Existing uploaded video.mp4",
      fileSizeBytes: 1,
      videoDurationSeconds: 1,
      resourceAttachmentMode: tutorial.collectionId ? "collection" : "manual",
      collectionId: tutorial.collectionId ?? undefined,
      steps:
        tutorial.steps?.map((step) => ({
          id: `step-${crypto.randomUUID()}`,
          title: step.title,
          resources: step.resources.map((resource) => ({
            id: `res-${crypto.randomUUID()}-${resource.resourceId}`,
            resourceId: resource.resourceId,
            instructionNote: resource.instructionNote,
          })),
        })) ?? [],
    })
  }, [editingTutorialResponse, form])

  // ── Fetch resources when course changes ───────────────────────
  const prevCourseRef = useRef<string>("")
  useEffect(() => {
    if (selectedCourseId === prevCourseRef.current) {
      return
    }

    prevCourseRef.current = selectedCourseId
    if (!selectedCourseId) {
      queueMicrotask(() => {
        setResources([])
        setResourceCollections([])
        form.setValue("steps", [])
        form.setValue("collectionId", undefined)
      })
      return
    }

    // Fetch individual resources (for manual mode)
    queueMicrotask(() => setIsLoadingResources(true))
    fetchResourcesByCourse(selectedCourseId)
      .then((fetched) => queueMicrotask(() => setResources(fetched)))
      .catch(() => toast.error(t("content.tutorialForm.loadResourcesError")))
      .finally(() => queueMicrotask(() => setIsLoadingResources(false)))

    // Fetch resource collections (for collection mode)
    queueMicrotask(() => setIsLoadingCollections(true))
    fetchResourceCollectionsByCourse(selectedCourseId)
      .then((fetched) => queueMicrotask(() => setResourceCollections(fetched)))
      .catch(() => toast.error(t("content.tutorialForm.loadCollectionsError")))
      .finally(() => queueMicrotask(() => setIsLoadingCollections(false)))
  }, [
    form,
    selectedCourseId,
    setIsLoadingCollections,
    setIsLoadingResources,
    setResourceCollections,
    setResources,
    t,
  ])

  // ── Mode switch: clear data when switching attachment mode ─────
  useEffect(() => {
    if (attachmentMode === "collection") {
      // Switching to collection mode: clear manual steps
      form.setValue("steps", [])
    } else {
      // Switching to manual mode: clear selected collection
      form.setValue("collectionId", undefined)
    }
  }, [attachmentMode, form])

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

  // ── Video File Selection Handler ──────────────────────────────

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }

    if (!isAllowedTutorialFileName(file.name)) {
      e.target.value = ""
      selectedFileRef.current = null
      setValue("fileName", "", { shouldValidate: true })
      setValue("fileSizeBytes", 0, { shouldValidate: true })
      setValue("videoDurationSeconds", 0, { shouldValidate: true })
      toast.error(
        t("content.tutorialForm.invalidFileType").replace(
          "{types}",
          TUTORIAL_ALLOWED_FILE_TYPE_COPY
        )
      )
      return
    }

    // Store the actual File object for later upload
    selectedFileRef.current = file

    // Fill metadata fields
    setValue("fileName", file.name, { shouldValidate: true })
    setValue("fileSizeBytes", file.size, { shouldValidate: true })

    // Extract video duration
    try {
      const duration = await getVideoDuration(file)
      setValue("videoDurationSeconds", duration, { shouldValidate: true })
    } catch {
      toast.error(t("content.tutorialForm.videoDurationError"))
    }
  }

  // ── Form Submission ───────────────────────────────────────────

  const onSubmit = useCallback(
    async (data: TutorialFormValues) => {
      if (isEditMode && editId) {
        try {
          const {
            resourceAttachmentMode,
            hightlights,
            steps,
            fileName: _,
            fileSizeBytes: __,
            videoDurationSeconds: ___,
            ...restData
          } = data
          const stepsPayload =
            resourceAttachmentMode === "manual"
              ? steps?.map((step) => ({
                  title: step.title,
                  resources: step.resources.map((res) => ({
                    resourceId: res.resourceId,
                    instructionNote: res.instructionNote,
                  })),
                }))
              : undefined
          await updateTutorial({
            id: editId,
            body: {
              ...restData,
              hightlights: hightlights.map((h) => h.value),
              collectionId:
                resourceAttachmentMode === "collection"
                  ? data.collectionId
                  : undefined,
              steps: stepsPayload,
            },
          }).unwrap()
          toast.success(t("content.tutorialForm.updated"))
          router.refresh()
        } catch (error: unknown) {
          toast.error(
            getFriendlyContentError(
              error,
              t("content.tutorialForm.updateError")
            )
          )
        }
        return
      }

      if (!selectedFileRef.current) {
        toast.error(t("content.tutorialForm.missingVideo"))
        return
      }

      try {
        const { resourceAttachmentMode, hightlights, steps, ...restData } = data
        const stepsPayload =
          resourceAttachmentMode === "manual"
            ? steps?.map((step) => ({
                title: step.title,
                resources: step.resources.map((res) => ({
                  resourceId: res.resourceId,
                  instructionNote: res.instructionNote,
                })),
              }))
            : undefined
        const payload = {
          ...restData,
          hightlights: hightlights.map((h) => h.value),
          collectionId:
            data.resourceAttachmentMode === "collection"
              ? data.collectionId
              : undefined,
          steps: stepsPayload,
        }

        const result = await createTutorial(payload).unwrap()
        const response = result.data

        const selectedFile = selectedFileRef.current
        const batch: UploadBatch = {
          resourceId: response.id,
          resourceTitle: data.title,
          files: [
            {
              id: response.fileId,
              fileName: response.fileName,
              fileSizeBytes: response.fileSizeBytes,
              uploadUrl: response.uploadUrl,
              file: selectedFile,
              mimeType: selectedFile.type,
              progress: 0,
              status: "pending" as const,
              resourceTitle: data.title,
            },
          ],
          createdAt: performance.now(),
        }

        addBatch(batch)

        startBatchUpload(batch).then(async () => {
          const currentBatch = useUploadStore
            .getState()
            .batches.find((b) => b.resourceId === response.id)
          if (!currentBatch) {
            return
          }

          const fileUpload = currentBatch.files[0]
          if (fileUpload?.status === "completed") {
            try {
              await confirmTutorialUpload({
                fileId: response.fileId,
                s3Key: response.s3Key,
              }).unwrap()
              toast.success(t("content.tutorialForm.uploaded"))
            } catch (error) {
              console.error("Failed to confirm tutorial:", error)
              toast.error(t("content.tutorialForm.confirmError"))
            }
          }
        })

        selectedFileRef.current = null
        form.reset()
      } catch (error: unknown) {
        const message = getFriendlyContentError(
          error,
          t("content.tutorialForm.createError")
        )
        toast.error(message)
        console.error("Failed to create tutorial:", {
          message,
          rawMessage: extractApiError(error),
        })
      }
    },
    [
      addBatch,
      confirmTutorialUpload,
      createTutorial,
      editId,
      form,
      isEditMode,
      router,
      updateTutorial,
      t,
    ]
  )

  const handleFormSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      void handleSubmit((data) => {
        setPendingSubmitData(data)
        setConfirmOpen(true)
      }, onInvalid)(event)
    },
    [handleSubmit, onInvalid]
  )

  const inferContentType = useCallback((item: ContentItem) => {
    // In a real app with proper types, check item.type or item.media
    if (item.title.toLowerCase().includes(".mp4")) {
      return "video"
    }
    if (item.title.toLowerCase().includes(".pdf")) {
      return "pdf"
    }
    if (item.title.toLowerCase().includes("quiz")) {
      return "quiz"
    }
    return "other"
  }, [])

  // Filter logic for ResourceExplorer
  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      const matchesSearch = item.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      if (filterType === "all") {
        return matchesSearch
      }
      return matchesSearch && inferContentType(item) === filterType
    })
  }, [resources, searchQuery, filterType, inferContentType])

  // Map resources to ContentItem for shared components
  const availableResourcesItems = useMemo<ContentItem[]>(() => {
    return resources as ContentItem[]
  }, [resources])

  const filteredItems = availableResourcesItems.filter((item: ContentItem) =>
    filteredResources.find((r: ResourceQueryItem) => r.id === item.id)
  )

  const isResourceSelectedInAnyStep = (id: string) => {
    return steps.some((s) => s.resources.some((res) => res.resourceId === id))
  }

  const handleAddResourceToStep = (id: string) => {
    // Find the last step and add the resource
    const currentSteps = [...steps]
    if (currentSteps.length === 0) {
      currentSteps.push({
        id: `step-${crypto.randomUUID()}`,
        title: t("content.tutorialBuilder.defaultStepTitle").replace(
          "{number}",
          "1"
        ),
        resources: [],
      })
    }
    const lastStep = currentSteps[currentSteps.length - 1]
    lastStep.resources.push({
      id: `res-${crypto.randomUUID()}-${id}`,
      resourceId: id,
      instructionNote: "",
    })
    form.setValue("steps", currentSteps)
  }

  // ── Section Renderers ─────────────────────────────────────

  const metadataSection = (
    <div className="space-y-4">
      <Field>
        <Label htmlFor="title">{t("content.form.titleLabel")}</Label>
        <Input
          id="title"
          {...form.register("title")}
          placeholder={t("content.tutorialForm.titlePlaceholder")}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </Field>

      <Field>
        <Label htmlFor="description">{t("common.descriptionLabel")}</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          placeholder={t("content.tutorialForm.descriptionPlaceholder")}
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
          <Label htmlFor="price">{t("content.form.priceLabel")}</Label>
          <Input
            id="price"
            type="number"
            {...form.register("price", { valueAsNumber: true })}
          />
          {errors.price && (
            <p className="text-sm text-destructive">{errors.price.message}</p>
          )}
        </Field>
        <Field>
          <Label htmlFor="discountBundle">
            {t("content.tutorialForm.bundleDiscountLabel")}
          </Label>
          <Input
            id="discountBundle"
            type="number"
            {...form.register("discountBundle", {
              valueAsNumber: true,
            })}
          />
          {errors.discountBundle && (
            <p className="text-sm text-destructive">
              {errors.discountBundle.message}
            </p>
          )}
        </Field>
      </div>

      {/* Highlights Dynamic Array */}
      <div className="space-y-4 border-t border-border/50 pt-4">
        <h3 className="text-lg font-semibold tracking-tight">
          {t("content.tutorialForm.keyLearningsTitle")}
        </h3>
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-start gap-2">
            <div className="w-full space-y-1">
              <Input
                {...form.register(`hightlights.${index}.value` as const)}
                placeholder={t("content.tutorialForm.highlightPlaceholder").replace(
                  "{number}",
                  String(index + 1)
                )}
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
          <Plus className="mr-2 size-4" /> {t("content.tutorialForm.addHighlight")}
        </Button>
      </div>
    </div>
  )

  const mediaSection = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {isEditMode
          ? t("content.tutorialForm.editVideoHint")
          : t("content.tutorialForm.selectVideoHint").replace(
              "{types}",
              TUTORIAL_ALLOWED_FILE_TYPE_COPY
            )}
      </p>

      <div className="flex gap-6 rounded-2xl border bg-muted/20 p-6">
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field>
            <Label htmlFor="fileName">{t("content.tutorialForm.fileNameLabel")}</Label>
            <Input
              id="fileName"
              {...form.register("fileName")}
              placeholder={t("content.tutorialForm.fileNamePlaceholder")}
              readOnly
              className="cursor-default rounded-xl bg-muted/50"
            />
            {errors.fileName && (
              <p className="text-xs text-destructive">
                {errors.fileName.message}
              </p>
            )}
          </Field>
          <Field>
            <Label htmlFor="fileSizeBytes">{t("content.tutorialForm.fileSizeLabel")}</Label>
            <Input
              id="fileSizeBytes"
              type="number"
              {...form.register("fileSizeBytes", {
                valueAsNumber: true,
              })}
              placeholder={t("content.tutorialForm.fileSizePlaceholder")}
              readOnly
              className="cursor-default rounded-xl bg-muted/50"
            />
          </Field>
          <Field>
            <Label htmlFor="videoDurationSeconds">
              {t("content.tutorialForm.durationLabel")}
            </Label>
            <Input
              id="videoDurationSeconds"
              type="number"
              {...form.register("videoDurationSeconds", {
                valueAsNumber: true,
              })}
              placeholder={t("content.tutorialForm.durationPlaceholder")}
              readOnly
              className="cursor-default rounded-xl bg-muted/50"
            />
          </Field>
        </div>

        {!isEditMode ? (
          <Field>
            <Label htmlFor="videoDurationSeconds">
              {t("content.tutorialForm.chooseVideoLabel")}
            </Label>
            <Input
              ref={fileInputRef}
              id="video-picker"
              type="file"
              accept={TUTORIAL_FILE_ACCEPT}
              className="hidden"
              onChange={handleVideoSelect}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="size-6" />
                {watchFileName
                  ? t("content.tutorialForm.changeVideoAction")
                  : t("content.tutorialForm.chooseVideoAction")}
              </Button>
              {/* {watchFileName && (
                <span className="text-xs text-muted-foreground">
                  {watchFileName} · {formatFileSize(watchFileSizeBytes)}
                </span>
              )} */}
            </div>
          </Field>
        ) : null}
      </div>
    </div>
  )

  const packagingSection = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field>
          <Label>{t("common.major")}</Label>
          <Select
            value={selectedMajorId}
            onValueChange={(val) => {
              setValue("majorId", val, { shouldValidate: true })
              setValue("courseId", "")
              setValue("steps", [])
              setValue("collectionId", undefined)
            }}
          >
            <SelectTrigger className="w-full justify-between rounded-xl">
              <SelectValue
                placeholder={
                  isLoadingMajors
                    ? t("content.tutorialForm.loadingMajors")
                    : t("content.tutorialForm.selectMajor")
                }
              />
            </SelectTrigger>
            <SelectContent className="z-50 w-full">
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
          <Label>{t("common.course")}</Label>
          <Select
            value={selectedCourseId}
            onValueChange={(val) => {
              setValue("courseId", val, { shouldValidate: true })
              setValue("steps", [])
              setValue("collectionId", undefined)
            }}
            disabled={!selectedMajorId}
          >
            <SelectTrigger className="w-full justify-between rounded-xl">
              <SelectValue
                placeholder={
                  isLoadingCourses
                    ? t("content.tutorialForm.loadingCourses")
                    : t("content.tutorialForm.selectCourse")
                }
              />
            </SelectTrigger>
            <SelectContent className="w-full">
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
      {/* ── Resource Attachment Section ───────────────────────────── */}
      {/* This section allows picking resources in one of two ways:    */}
      {/*   1. "From Collection" — select an existing Resource Collection */}
      {/*   2. "Manual Pick" — use ResourceExplorer + TutorialStepBuilder */}
      <div className="space-y-4 border-t border-border/50 pt-4">
        <div className="space-y-1">
          <Label className="text-base text-primary">
            {t("content.tutorialForm.studyMaterialsLabel")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t("content.tutorialForm.studyMaterialsHint")}
          </p>
        </div>

        {/* Mode Toggle using inner Tabs */}
        <Tabs
          value={attachmentMode}
          onValueChange={(val) =>
            setValue("resourceAttachmentMode", val as "collection" | "manual")
          }
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="collection" className="rounded-lg">
              <LibraryIcon /> {t("content.tutorialForm.useCollection")}
            </TabsTrigger>
            <TabsTrigger value="manual" className="rounded-lg">
              <TableOfContentsIcon /> {t("content.tutorialForm.pickOneByOne")}
            </TabsTrigger>
          </TabsList>

          {/* ── "From Collection" mode ── */}
          <TabsContent
            value="collection"
            className="mt-4 animate-in fade-in slide-in-from-bottom-2"
          >
            <CollectionPicker
              collections={resourceCollections}
              selectedId={selectedCollectionId}
              onSelect={(id) =>
                setValue("collectionId", id, { shouldValidate: true })
              }
              isLoading={isLoadingCollections}
            />
          </TabsContent>

          {/* ── "Manual Pick" mode ── */}
          <TabsContent
            value="manual"
            className="mt-4 animate-in fade-in slide-in-from-bottom-2"
          >
            <div className="space-y-4">
              <div className="flex animate-in items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {t("content.tutorialForm.organizeStepsHint")}
                  </p>
                </div>
                {errors.steps && (
                  <p className="text-sm text-destructive">
                    {t("content.tutorialForm.stepsError")}
                  </p>
                )}
                {isLoadingResources && (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="flex flex-col">
                  <ResourceExplorer
                    items={filteredItems}
                    searchQuery={searchQuery}
                    filterType={filterType}
                    onSearchChange={setSearchQuery}
                    onFilterChange={setFilterType}
                    onAddItem={handleAddResourceToStep}
                    isSelected={isResourceSelectedInAnyStep}
                    inferContentType={inferContentType}
                    isLoading={isLoadingResources}
                    hasSelectedCourse={!!selectedCourseId}
                  />
                </div>
                <div className="flex flex-col">
                  <TutorialStepBuilder
                    steps={steps}
                    onChange={(newSteps) => form.setValue("steps", newSteps)}
                    availableResources={availableResourcesItems}
                    inferType={inferContentType}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )

  // ── Main Render ───────────────────────────────────────────

  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {isEditMode
                ? t("content.tutorialForm.updateTitle")
                : t("content.tutorialForm.createTitle")}
            </CardTitle>
            <CardDescription>
              {isEditMode
                ? t("content.tutorialForm.updateDescription")
                : t("content.tutorialForm.createDescription").replace(
                    "{types}",
                    TUTORIAL_ALLOWED_FILE_TYPE_COPY
                  )}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Label
              htmlFor="tutorial-mode-switch"
              className="text-sm text-muted-foreground"
            >
              {t("content.tutorialForm.advancedLabel")}
            </Label>
            <Switch
              id="tutorial-mode-switch"
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
                  {t("content.tutorialForm.detailsSection")}
                </h3>
                {metadataSection}
              </div>
              <div>
                <h3 className="mb-4 text-lg font-semibold tracking-tight">
                  {t("content.tutorialForm.videoSection")}
                </h3>
                {mediaSection}
              </div>
              <Separator />
              <div>
                <h3 className="mb-4 text-lg font-semibold tracking-tight">
                  {t("content.tutorialForm.courseResourcesSection")}
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
                <TabsTrigger value="metadata" className="rounded-lg">
                  {t("content.tutorialForm.detailsSection")}
                </TabsTrigger>
                <TabsTrigger value="media" className="rounded-lg">
                  {t("content.tutorialForm.videoSection")}
                </TabsTrigger>
                <TabsTrigger value="packaging" className="rounded-lg">
                  {t("content.tutorialForm.courseResourcesSection")}
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="metadata"
                className="mt-0 animate-in space-y-6 fade-in slide-in-from-bottom-2"
              >
                {metadataSection}
              </TabsContent>

              <TabsContent
                value="media"
                className="mt-0 animate-in space-y-6 fade-in slide-in-from-bottom-2"
              >
                {mediaSection}
              </TabsContent>

              <TabsContent
                value="packaging"
                className="mt-0 animate-in space-y-6 fade-in slide-in-from-bottom-2"
              >
                {packagingSection}
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
                ? t("content.tutorialForm.updatingAction")
                : t("content.tutorialForm.updateAction")
              : isLoading
                ? t("content.tutorialForm.preparingUploadAction")
                : t("content.tutorialForm.createAndUploadAction")}
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            variant={isEditMode ? "warning" : "confirm"}
            title={
              isEditMode
                ? t("content.tutorialForm.confirmUpdateTitle")
                : t("content.tutorialForm.confirmCreateTitle")
            }
            description={
              isEditMode
                ? t("content.tutorialForm.confirmUpdateDescription")
                : t("content.tutorialForm.confirmCreateDescription")
            }
            confirmLabel={
              isEditMode
                ? t("content.tutorialForm.updateAction")
                : t("content.tutorialForm.createAction")
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
