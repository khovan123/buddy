"use client"

import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  File,
  Loader2,
  RotateCcw,
  Upload,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

import {
  type UploadBatch,
  type UploadFileItem,
  type UploadFileStatus,
  retryBatchFailedUploads,
  retryFileUpload,
  useUploadStore,
} from "../store/upload-store"

// ── Helpers ──────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return "0 B"
  }
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

function getStatusIcon(status: UploadFileStatus) {
  switch (status) {
    case "pending":
      return <File className="size-4 text-muted-foreground" />
    case "uploading":
      return <Loader2 className="size-4 animate-spin text-primary" />
    case "completed":
      return <Check className="size-4 text-emerald-500" />
    case "failed":
      return <AlertCircle className="size-4 text-destructive" />
  }
}

function getStatusColor(status: UploadFileStatus): string {
  switch (status) {
    case "pending":
      return "bg-muted-foreground/30"
    case "uploading":
      return "bg-primary"
    case "completed":
      return "bg-emerald-500"
    case "failed":
      return "bg-destructive"
  }
}

// ── Sub-components ───────────────────────────────────────────

function UploadFileRow({
  file,
  resourceId,
}: {
  file: UploadFileItem
  resourceId: string
}) {
  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50">
      {/* Status Icon */}
      <div className="shrink-0">{getStatusIcon(file.status)}</div>

      {/* File Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm leading-tight font-medium">
          {file.fileName}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatFileSize(file.fileSizeBytes)}
          </span>
          {file.status === "uploading" && (
            <span className="text-xs font-medium text-primary">
              {file.progress}%
            </span>
          )}
          {file.status === "failed" && file.error && (
            <span className="truncate text-xs text-destructive">
              {file.error}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        {(file.status === "uploading" || file.status === "completed") && (
          <Progress
            value={file.progress}
            className="mt-1 h-1.5"
            indicatorClassName={cn(
              "transition-all duration-300 ease-out",
              getStatusColor(file.status)
            )}
          />
        )}
      </div>

      {/* Retry Button (per file) */}
      {file.status === "failed" && (
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => retryFileUpload(resourceId, file.id)}
          title="Retry upload"
        >
          <RotateCcw className="size-3.5 text-muted-foreground" />
        </Button>
      )}
    </div>
  )
}

function UploadBatchSection({ batch }: { batch: UploadBatch }) {
  const removeBatch = useUploadStore((s) => s.removeBatch)
  const completedFiles = batch.files.filter(
    (f) => f.status === "completed"
  ).length
  const failedFiles = batch.files.filter((f) => f.status === "failed").length
  const totalFiles = batch.files.length
  const allDone = batch.files.every(
    (f) => f.status === "completed" || f.status === "failed"
  )

  return (
    <div className="border-b border-border/50 last:border-b-0">
      {/* Batch Header */}
      <div className="flex items-center justify-between bg-muted/30 px-4 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-muted-foreground">
            {batch.resourceTitle}
          </p>
          <p className="text-3xs text-muted-foreground/70">
            {completedFiles}/{totalFiles} files uploaded
            {failedFiles > 0 && (
              <span className="ml-1 text-destructive">
                · {failedFiles} failed
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {failedFiles > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-3xs"
              onClick={() => retryBatchFailedUploads(batch.resourceId)}
            >
              <RotateCcw className="size-3" />
              Retry All
            </Button>
          )}
          {allDone && (
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => removeBatch(batch.resourceId)}
            >
              <X className="size-3" />
            </Button>
          )}
        </div>
      </div>

      {/* File Rows */}
      {batch.files.map((file) => (
        <UploadFileRow
          key={file.id}
          file={file}
          resourceId={batch.resourceId}
        />
      ))}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────

export function UploadProgressPanel() {
  const { batches, isOpen, isMinimized, toggleMinimized, clearCompleted } =
    useUploadStore()

  // Don't render if no uploads
  if (!isOpen || batches.length === 0) {
    return null
  }

  // Aggregate stats
  const totalFiles = batches.reduce((sum, b) => sum + b.files.length, 0)
  const completedFiles = batches.reduce(
    (sum, b) => sum + b.files.filter((f) => f.status === "completed").length,
    0
  )
  const uploadingFiles = batches.reduce(
    (sum, b) => sum + b.files.filter((f) => f.status === "uploading").length,
    0
  )
  const failedFiles = batches.reduce(
    (sum, b) => sum + b.files.filter((f) => f.status === "failed").length,
    0
  )
  const allComplete = completedFiles + failedFiles === totalFiles

  // Overall progress
  const overallProgress =
    totalFiles > 0
      ? Math.round(
          batches.reduce(
            (sum, b) => sum + b.files.reduce((s, f) => s + f.progress, 0),
            0
          ) / totalFiles
        )
      : 0

  return (
    <div
      className={cn(
        "fixed right-4 bottom-4 z-50 w-95 overflow-hidden rounded-lg border bg-background shadow-2xl",
        "animate-in duration-300 slide-in-from-bottom-5 fade-in"
      )}
    >
      {/* Header */}
      <div
        className="flex cursor-pointer items-center justify-between bg-muted/60 px-4 py-3 backdrop-blur-sm"
        onClick={toggleMinimized}
      >
        <div className="flex items-center gap-2.5">
          {allComplete ? (
            <div className="flex size-6 items-center justify-center rounded-full bg-emerald-500/15">
              <Check className="size-3.5 text-emerald-500" />
            </div>
          ) : (
            <div className="flex size-6 items-center justify-center rounded-full bg-primary/15">
              <Upload className="size-3.5 text-primary" />
            </div>
          )}
          <div>
            <p className="text-sm leading-tight font-semibold">
              {allComplete
                ? failedFiles > 0
                  ? `${completedFiles} uploaded, ${failedFiles} failed`
                  : `${completedFiles} upload${completedFiles > 1 ? "s" : ""} complete`
                : `Uploading ${uploadingFiles} of ${totalFiles} file${totalFiles > 1 ? "s" : ""}`}
            </p>
            {!allComplete && (
              <p className="text-3xs text-muted-foreground">
                {overallProgress}% complete
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {allComplete && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={(e) => {
                e.stopPropagation()
                clearCompleted()
              }}
            >
              <X className="size-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="size-7">
            {isMinimized ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Overall progress bar (always visible) */}
      {!allComplete && (
        <Progress
          value={overallProgress}
          className="h-1 rounded-none"
          indicatorClassName="transition-all duration-500 ease-out"
        />
      )}

      {/* Body (collapsible) */}
      {!isMinimized && (
        <div className="max-h-80 overflow-y-auto">
          {batches.map((batch) => (
            <UploadBatchSection key={batch.resourceId} batch={batch} />
          ))}
        </div>
      )}
    </div>
  )
}
