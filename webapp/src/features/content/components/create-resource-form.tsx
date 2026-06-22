"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { useRouter, useSearchParams } from "next/navigation"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  Check,
  Copy,
  FileUp,
  Info,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/molecules/confirm-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import {
  useConfirmResourceUploadMutation,
  useCreateResourceMutation,
  useGetContentMetaQuery,
  useGetCoursesByMajorQuery,
  useGetResourceByIdQuery,
  useUpdateResourceMutation,
} from "@/features/content/services/content-api"
import { extractApiError } from "@/types/api"

import { ResourceFormValues, resourceSchema } from "../schema"
import { fetchMyResourceCollectionsByTaxonomy } from "../services/content.client"
import {
  startBatchUpload,
  type UploadBatch,
  useUploadStore,
} from "../store/upload-store"
import type {
  CollectionQueryItem,
  CreateResourceResponse,
  PresignedUrlItem,
} from "../types"
import {
  RESOURCE_ALLOWED_FILE_TYPES_COPY,
  RESOURCE_FILE_ACCEPT,
  isAllowedResourceFileName,
} from "../utils/resource-file-validation"
import { getFriendlyContentError } from "../utils/user-facing-content"

import { CollectionPicker } from "./collection-picker"
import { ThumbnailPicker } from "./thumbnail-picker"

// ── Helpers ──────────────────────────────────────────────────

/** Format bytes to human-readable size */
function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return "0 B"
  }
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

// ── Field-to-Tab mapping for error auto-navigation ──────────
const FIELD_TAB_MAP: Record<string, string> = {
  title: "metadata",
  summary: "metadata",
  hightlights: "metadata",
  files: "attachments",
  thumbnailFile: "attachments",
  thumbnailBase64: "attachments",
  majorId: "taxonomy",
  courseId: "taxonomy",
  price: "taxonomy",
  collectionId: "taxonomy",
}

type ResourceSubmitStage =
  | "idle"
  | "preparing"
  | "uploading"
  | "confirming"
  | "processing"

const RESOURCE_SUBMIT_STAGE_COPY: Record<
  Exclude<ResourceSubmitStage, "idle">,
  { title: string; description: string }
> = {
  preparing: {
    title: "Getting your file ready",
    description: "We are setting up a safe place for your file.",
  },
  uploading: {
    title: "Uploading your file",
    description: "You can keep this page open while the file is uploaded.",
  },
  confirming: {
    title: "Almost done",
    description: "Your file uploaded. We are preparing it for review.",
  },
  processing: {
    title: "Checking your content",
    description:
      "We will read the file and check it in the background. You can follow the result in Content.",
  },
}

export function CreateResourceForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("edit") || undefined
  const isEditMode = Boolean(editId)
  const [createResource, { isLoading }] = useCreateResourceMutation()
  const [updateResource, { isLoading: isUpdating }] =
    useUpdateResourceMutation()
  const [confirmResourceUpload] = useConfirmResourceUploadMutation()

  // ── Mode & Tab state ──────────────────────────────────────
  const [mode, setMode] = useState<"minimal" | "advanced">("minimal")
  const [activeTab, setActiveTab] = useState("metadata")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitStage, setSubmitStage] = useState<ResourceSubmitStage>("idle")
  const [pendingSubmitData, setPendingSubmitData] =
    useState<ResourceFormValues | null>(null)

  // Track upload result to display presigned URLs after successful creation
  const [uploadResult, setUploadResult] =
    useState<CreateResourceResponse | null>(null)
  const [resourceCollections, setResourceCollections] = useState<
    CollectionQueryItem[]
  >([])
  const [isLoadingCollections, setIsLoadingCollections] = useState(false)

  // Hidden file input refs – one per file row
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Store the actual selected File objects for upload
  const selectedFilesRef = useRef<Map<number, File>>(new Map())

  // Upload store for background uploads
  const addBatch = useUploadStore((s) => s.addBatch)

  // React Hook Form
  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: "",
      summary: "",
      hightlights: [{ value: "" }],
      majorId: "",
      courseId: "",
      price: 0,
      files: [
        {
          fileName: "",
          fileSizeBytes: 0,
          mimeType: "",
        },
      ],
      collectionId: "",
    },
  })

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form

  const {
    fields: highlightFields,
    append: appendHighlight,
    remove: removeHighlight,
  } = useFieldArray({
    control,
    name: "hightlights",
  })

  const {
    fields: fileFields,
    append: appendFile,
    remove: removeFile,
  } = useFieldArray({
    control,
    name: "files",
  })

  // Watch for Cascading Dropdowns
  const selectedMajorId = useWatch({ name: "majorId", control })
  const selectedCourseId = useWatch({ name: "courseId", control })
  const selectedCollectionId = useWatch({ name: "collectionId", control })
  const thumbnailBase64 = useWatch({ name: "thumbnailBase64", control })
  const watchedFiles = useWatch({ name: "files", control }) || []

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

  const { data: editingResourceResponse } = useGetResourceByIdQuery(editId!, {
    skip: !editId,
  })

  useEffect(() => {
    const resource = editingResourceResponse?.data
    if (!resource) {
      return
    }

    form.reset({
      title: resource.title,
      summary: resource.summary,
      hightlights: resource.hightlights.map((value) => ({ value })),
      majorId: resource.majorId,
      courseId: resource.courseId,
      price: resource.price,
      collectionId: resource.collectionId ?? "",
      thumbnailBase64: "",
      files: [
        {
          fileName: "Existing uploaded file",
          fileSizeBytes: 1,
          mimeType: "",
        },
      ],
    })
  }, [editingResourceResponse, form])

  useEffect(() => {
    const editingResource = editingResourceResponse?.data
    const isInitialEditTaxonomy =
      isEditMode &&
      editingResource?.majorId === selectedMajorId &&
      editingResource?.courseId === selectedCourseId

    if (!isInitialEditTaxonomy) {
      setValue("collectionId", "", { shouldValidate: true })
    }

    if (!selectedMajorId || !selectedCourseId) {
      queueMicrotask(() => setResourceCollections([]))
      return
    }

    let ignore = false
    queueMicrotask(() => setIsLoadingCollections(true))
    fetchMyResourceCollectionsByTaxonomy(selectedMajorId, selectedCourseId)
      .then((collections) => {
        if (!ignore) {
          queueMicrotask(() => setResourceCollections(collections))
        }
      })
      .catch(() => toast.error("We could not load your collections."))
      .finally(() => {
        if (!ignore) {
          queueMicrotask(() => setIsLoadingCollections(false))
        }
      })

    return () => {
      ignore = true
    }
  }, [
    editingResourceResponse,
    isEditMode,
    selectedCourseId,
    selectedMajorId,
    setValue,
  ])

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

  // ── File Selection Handler ─────────────────────────────────

  const handleFileSelect = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }

    if (!isAllowedResourceFileName(file.name)) {
      e.target.value = ""
      selectedFilesRef.current.delete(index)
      setValue(`files.${index}.fileName`, "", { shouldValidate: true })
      setValue(`files.${index}.fileSizeBytes`, 0, {
        shouldValidate: true,
      })
      setValue(`files.${index}.mimeType`, "", {
        shouldValidate: true,
      })
      toast.error(`Resources only support ${RESOURCE_ALLOWED_FILE_TYPES_COPY} files.`)
      return
    }

    // Store the actual File object for later upload
    selectedFilesRef.current.set(index, file)

    setValue(`files.${index}.fileName`, file.name, { shouldValidate: true })
    setValue(`files.${index}.fileSizeBytes`, file.size, {
      shouldValidate: true,
    })
    setValue(`files.${index}.mimeType`, file.type || "", {
      shouldValidate: true,
    })
  }

  // ── Form Submission ────────────────────────────────────────

  const onSubmit = async (data: ResourceFormValues) => {
    if (isEditMode && editId) {
      try {
        const { thumbnailFile: _, files: __, ...restData } = data
        await updateResource({
          id: editId,
          body: {
            ...restData,
            hightlights: restData.hightlights.map((h) => h.value),
            collectionId: restData.collectionId || undefined,
          },
        }).unwrap()
        toast.success("Resource updated.")
        router.refresh()
      } catch (error: unknown) {
        toast.error(
          extractApiError(error) ||
            "We could not update this resource. Please review the form and try again."
        )
      }
      return
    }

    // Validate that all files have been selected
    const missingFiles: number[] = []
    data.files.forEach((_, idx) => {
      if (!selectedFilesRef.current.has(idx)) {
        missingFiles.push(idx + 1)
      }
    })

    if (missingFiles.length > 0) {
      toast.error(
        `Please choose a file for slot(s): #${missingFiles.join(", #")}`
      )
      return
    }

    try {
      setSubmitStage("preparing")
      // Exclude thumbnailFile from the request payload to prevent 400 Bad Request
      const { thumbnailFile: _, ...restData } = data
      const payload = {
        ...restData,
        hightlights: restData.hightlights.map((h) => h.value),
        collectionId: restData.collectionId || undefined,
      }

      const result = await createResource(payload).unwrap()
      const response = result.data

      // Build the upload batch from the presigned URLs + selected files
      const batch: UploadBatch = {
        resourceId: response.resourceId,
        resourceTitle: data.title,
        files: response.uploadUrls.map(
          (urlItem: PresignedUrlItem, idx: number) => ({
            id: urlItem.fileId,
            fileName: urlItem.fileName,
            fileSizeBytes: urlItem.fileSizeBytes,
            uploadUrl: urlItem.uploadUrl,
            file: selectedFilesRef.current.get(idx)!,
            mimeType: urlItem.mimeType,
            progress: 0,
            status: "pending" as const,
            resourceTitle: data.title,
          })
        ),
        createdAt: new Date().getTime(),
      }

      // Add to global upload store and start background upload
      addBatch(batch)

      setSubmitStage("uploading")
      startBatchUpload(batch).then(async () => {
        // Read fresh state directly from Zustand
        const currentBatch = useUploadStore
          .getState()
          .batches.find((b) => b.resourceId === response.resourceId)
        if (!currentBatch) {
          return
        }

        const allCompleted = currentBatch.files.every(
          (f) => f.status === "completed"
        )
        if (allCompleted) {
          try {
            setSubmitStage("confirming")
            await confirmResourceUpload({
              resourceId: response.resourceId,
              fileIds: currentBatch.files.map((f) => f.id),
            }).unwrap()
            setSubmitStage("processing")
            toast.success(
              "Resource uploaded. We will read and check it in the background."
            )
          } catch (error) {
            console.error(
              "Failed to confirm resource:",
              getFriendlyContentError(error)
            )
            toast.error(
              "The file uploaded, but we could not start checking it. Please try again from Content."
            )
            setSubmitStage("idle")
          }
        }
      })

      // Reset form & selected files so user can create another
      selectedFilesRef.current.clear()
      form.reset()
    } catch (error: unknown) {
      const message = getFriendlyContentError(
        error,
        "We could not create this resource. Please review the form and try again."
      )
      toast.error(message)
      console.error("Create resource failed:", {
        message,
        rawMessage: extractApiError(error),
      })
      setSubmitStage("idle")
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    void handleSubmit((data) => {
      setPendingSubmitData(data)
      setConfirmOpen(true)
    }, onInvalid)(e)
  }

  // ── Copy to clipboard helper ───────────────────────────────

  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const copyToClipboard = async (url: string) => {
    await navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    toast.success("Upload link copied.")
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  // ── Upload Result Panel ────────────────────────────────────

  if (uploadResult) {
    return (
      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/15">
              <Check className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle>Resource created.</CardTitle>
              <CardDescription>
                Use the upload links below to send your files safely.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resource Info */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Resource:</span>
                <p className="font-mono text-xs">{uploadResult.resourceId}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Slug:</span>
                <p className="font-mono text-xs">{uploadResult.slug}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className="font-semibold text-amber-500">
                  {uploadResult.status}
                </p>
              </div>
            </div>
          </div>

          {/* Upload URLs */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold tracking-tight">
              Upload URLs
            </h3>
            {uploadResult.uploadUrls.map(
              (item: PresignedUrlItem, index: number) => (
                <div
                  key={item.fileId}
                  className="rounded-lg border bg-muted/20 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Upload className="size-4 text-primary" />
                      <span className="font-medium">{item.fileName}</span>
                      <span className="text-xs text-muted-foreground">
                        ({formatFileSize(item.fileSizeBytes)})
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      File #{index + 1} · Est. {Math.ceil(item.estimatedTime)}s
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={item.uploadUrl}
                      className="font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(item.uploadUrl)}
                    >
                      {copiedUrl === item.uploadUrl ? (
                        <Check className="size-4 text-emerald-500" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )
            )}
          </div>

          <Button
            onClick={() => setUploadResult(null)}
            variant="outline"
            className="w-full"
          >
            <Plus className="mr-2 size-4" /> Create Another Resource
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ── Section Renderers ─────────────────────────────────────
  const activeSubmitStage =
    submitStage === "idle" ? null : RESOURCE_SUBMIT_STAGE_COPY[submitStage]

  const metadataSection = (
    <div className="space-y-4">
      <Field>
        <Label htmlFor="resource-title">Title</Label>
        <Input
          id="resource-title"
          {...form.register("title")}
          placeholder="e.g. Calculus II Complete Lecture Notes"
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </Field>

      <Field>
        <Label htmlFor="resource-summary">Summary</Label>
        <Textarea
          id="resource-summary"
          {...form.register("summary")}
          placeholder="Brief description of what the resource contains..."
          className="min-h-24"
        />
        {errors.summary && (
          <p className="text-sm text-destructive">{errors.summary.message}</p>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <Label htmlFor="resource-price">Price (VND)</Label>
          <Input
            id="resource-price"
            type="number"
            {...form.register("price", { valueAsNumber: true })}
          />
          {errors.price && (
            <p className="text-sm text-destructive">{errors.price.message}</p>
          )}
        </Field>
      </div>

      {/* Highlights Dynamic Array */}
      <div className="space-y-4 border-t border-border/50 pt-4">
        <h3 className="text-lg font-semibold tracking-tight">Key Highlights</h3>
        {highlightFields.map((field, index) => (
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
            {highlightFields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeHighlight(index)}
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
          onClick={() => appendHighlight({ value: "" })}
          className="rounded-xl border-dashed"
        >
          <Plus className="mr-2 size-4" /> Add Highlight
        </Button>
      </div>
    </div>
  )

  const mediaSection = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {isEditMode
          ? "Your uploaded files will stay the same while you edit the details."
          : `Add a ${RESOURCE_ALLOWED_FILE_TYPES_COPY} study file. After upload, we will read and check it before learners can see it.`}
      </p>

      {!isEditMode &&
        fileFields.map((field, index) => (
          <div
            key={field.id}
            className="flex items-center gap-3 rounded-xl border bg-muted/20 p-4"
          >
            <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-4">
              <Field>
                <Label htmlFor={`file-name-${index}`}>File Name</Label>
                <Input
                  id={`file-name-${index}`}
                  {...form.register(`files.${index}.fileName` as const)}
                  placeholder="lecture-notes.md"
                  readOnly
                  className="cursor-default rounded-xl bg-muted/50"
                />
                {errors.files?.[index]?.fileName && (
                  <p className="text-xs text-destructive">
                    {errors.files[index]?.fileName?.message}
                  </p>
                )}
              </Field>
              <Field>
                <Label htmlFor={`file-size-${index}`}>File Size (bytes)</Label>
                <Input
                  id={`file-size-${index}`}
                  type="number"
                  {...form.register(`files.${index}.fileSizeBytes` as const, {
                    valueAsNumber: true,
                  })}
                  placeholder="1048576"
                  readOnly
                  className="cursor-default rounded-xl bg-muted/50"
                />
                {errors.files?.[index]?.fileSizeBytes && (
                  <p className="text-xs text-destructive">
                    {errors.files[index]?.fileSizeBytes?.message}
                  </p>
                )}
              </Field>
              <Field>
                <Label htmlFor={`file-mime-${index}`}>
                  MIME Type (optional)
                </Label>
                <Input
                  id={`file-mime-${index}`}
                  {...form.register(`files.${index}.mimeType` as const)}
                  placeholder="text/markdown"
                  readOnly
                  className="cursor-default rounded-xl bg-muted/50"
                />
              </Field>

              <Field>
                <Label htmlFor={`file-mime-${index}`}>
                  Choose File {index + 1}
                </Label>
                <Input
                  ref={(el) => {
                    fileInputRefs.current[index] = el
                  }}
                  id={`file-picker-${index}`}
                  type="file"
                  accept={RESOURCE_FILE_ACCEPT}
                  className="hidden"
                  onChange={(e) => handleFileSelect(index, e)}
                />
                <div className="flex min-h-10 items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-center whitespace-nowrap md:w-auto"
                    onClick={() => fileInputRefs.current[index]?.click()}
                  >
                    <FileUp className="size-5" />
                    {watchedFiles[index]?.fileName
                      ? "Change File"
                      : "Choose File"}
                  </Button>
                  {/* {watchedFiles[index]?.fileName && (
                    <span className="text-xs text-muted-foreground">
                      {watchedFiles[index]?.fileName} ·{" "}
                      {formatFileSize(watchedFiles[index]?.fileSizeBytes || 0)}
                    </span>
                  )} */}
                </div>
              </Field>
            </div>
            {fileFields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => {
                  selectedFilesRef.current.delete(index)
                  removeFile(index)
                }}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      {errors.files?.root && (
        <p className="text-sm text-destructive">{errors.files.root.message}</p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isEditMode}
        onClick={() =>
          appendFile({ fileName: "", fileSizeBytes: 0, mimeType: "" })
        }
        className={isEditMode ? "hidden" : "rounded-xl border-dashed"}
      >
        <Plus className="mr-2 size-4" /> Add File
      </Button>

      {/* Thumbnail */}
      <div className="border-t border-border/50 pt-4">
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
                labelContext="Resource"
                error={fieldState.error?.message}
              />
            </div>
          )}
        />
      </div>
    </div>
  )

  const packagingSection = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field>
          <Label>Major</Label>
          <Select
            value={selectedMajorId}
            onValueChange={(val) => {
              setValue("majorId", val, { shouldValidate: true })
              setValue("courseId", "")
              setValue("collectionId", "")
            }}
          >
            <SelectTrigger className="w-full justify-between rounded-xl">
              <SelectValue
                placeholder={
                  isLoadingMajors ? "Loading Majors..." : "Select Major..."
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
          <Label>Course</Label>
          <Select
            value={selectedCourseId}
            onValueChange={(val) => {
              setValue("courseId", val, { shouldValidate: true })
              setValue("collectionId", "")
            }}
            disabled={!selectedMajorId}
          >
            <SelectTrigger className="w-full justify-between rounded-xl">
              <SelectValue
                placeholder={
                  isLoadingCourses ? "Loading Options..." : "Select Course..."
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
      <div className="border-t border-border/50 pt-4">
        <Field>
          <Label>Collection</Label>
          {!selectedMajorId || !selectedCourseId ? (
            <div className="rounded-xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              Select a major and course to load your matching resource
              collections.
            </div>
          ) : (
            <CollectionPicker
              collections={resourceCollections}
              selectedId={selectedCollectionId || undefined}
              onSelect={(id) =>
                setValue("collectionId", id, { shouldValidate: true })
              }
              isLoading={isLoadingCollections}
              helperText="Select one of your matching Resource Collections for this resource."
              emptyTitle="No matching Resource Collections found"
              emptyDescription="Create a Resource Collection for this major and course, then come back here."
            />
          )}
          <input type="hidden" {...form.register("collectionId")} />
        </Field>
      </div>
    </div>
  )

  // ── Main Form ──────────────────────────────────────────────

  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {isEditMode ? "Update resource" : "Create resource"}
            </CardTitle>
            <CardDescription>
              {isEditMode
                ? "Update the details, price, course, and cover image."
                : `Add ${RESOURCE_ALLOWED_FILE_TYPES_COPY} study materials. We will upload and check them after you submit.`}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Label
              htmlFor="resource-mode-switch"
              className="text-sm text-muted-foreground"
            >
              Advanced
            </Label>
            <Switch
              id="resource-mode-switch"
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
                {metadataSection}
              </div>
              <div>
                <h3 className="mb-4 text-lg font-semibold tracking-tight">
                  Files
                </h3>
                {mediaSection}
              </div>
              <Separator />
              <div>
                <h3 className="mb-4 text-lg font-semibold tracking-tight">
                  Course & price
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
                  Details
                </TabsTrigger>
                <TabsTrigger value="attachments" className="rounded-lg">
                  Files
                </TabsTrigger>
                <TabsTrigger value="taxonomy" className="rounded-lg">
                  Course & price
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="metadata"
                className="mt-0 animate-in space-y-6 fade-in slide-in-from-bottom-2"
              >
                {metadataSection}
              </TabsContent>

              <TabsContent
                value="attachments"
                className="mt-0 animate-in space-y-6 fade-in slide-in-from-bottom-2"
              >
                {mediaSection}
              </TabsContent>

              <TabsContent
                value="taxonomy"
                className="mt-0 animate-in space-y-6 fade-in slide-in-from-bottom-2"
              >
                {packagingSection}
              </TabsContent>
            </Tabs>
          )}

          {activeSubmitStage ? (
            <Alert className="border-primary/30 bg-primary/5">
              {submitStage === "processing" ? (
                <Info className="size-4 text-primary" />
              ) : (
                <Loader2 className="size-4 animate-spin text-primary" />
              )}
              <AlertTitle>{activeSubmitStage.title}</AlertTitle>
              <AlertDescription>
                {activeSubmitStage.description}
              </AlertDescription>
            </Alert>
          ) : null}

          <Button
            type="submit"
            disabled={isLoading || isUpdating || submitStage !== "idle"}
            className="h-12 w-full rounded-xl bg-linear-to-r from-primary to-accent font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            {(isLoading || isUpdating || submitStage !== "idle") && (
              <Loader2 className="mr-2 size-5 animate-spin" />
            )}
            {isEditMode
              ? isUpdating
                ? "Updating resource..."
                : "Update resource"
              : submitStage !== "idle"
                ? activeSubmitStage?.title
                : "Create resource"}
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            variant={isEditMode ? "warning" : "confirm"}
            title={
              isEditMode ? "Update this resource?" : "Create this resource?"
            }
            description={
              isEditMode
                ? "Your resource changes will be saved."
                : "Your resource will be created and the selected files will start uploading."
            }
            confirmLabel={isEditMode ? "Update resource" : "Create resource"}
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
