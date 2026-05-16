"use client"

import {
  AlertCircle,
  Check,
  Clock,
  File,
  Loader2,
  RotateCcw,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

function formatRelativeTime(timestamp: number): string {
  const diff = new Date().getTime() - timestamp
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) {
    return "Just now"
  }
  if (minutes < 60) {
    return `${minutes}m ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }
  return `${Math.floor(hours / 24)}d ago`
}

function statusBadge(status: UploadFileStatus) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <Clock className="size-3" />
          Pending
        </Badge>
      )
    case "uploading":
      return (
        <Badge
          variant="outline"
          className="gap-1 border-primary/30 text-primary"
        >
          <Loader2 className="size-3 animate-spin" />
          Uploading
        </Badge>
      )
    case "completed":
      return (
        <Badge
          variant="outline"
          className="gap-1 border-emerald-500/30 text-emerald-600"
        >
          <Check className="size-3" />
          Done
        </Badge>
      )
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="size-3" />
          Failed
        </Badge>
      )
  }
}

// ── File Row ─────────────────────────────────────────────────

function HistoryFileRow({
  file,
  resourceId,
}: {
  file: UploadFileItem
  resourceId: string
}) {
  return (
    <div className="group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50">
      {/* Icon */}
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <File className="size-4 text-muted-foreground" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.fileName}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(file.fileSizeBytes)}</span>
          {file.mimeType && (
            <>
              <span className="text-border">·</span>
              <span>{file.mimeType}</span>
            </>
          )}
        </div>

        {/* Progress Bar (for uploading/completed) */}
        {(file.status === "uploading" || file.status === "completed") && (
          <Progress
            value={file.progress}
            className="mt-1.5 h-1.5"
            indicatorClassName={cn(
              "transition-all duration-300",
              file.status === "completed" ? "bg-emerald-500" : "bg-primary"
            )}
          />
        )}

        {/* Error message */}
        {file.status === "failed" && file.error && (
          <p className="mt-1 text-xs text-destructive">{file.error}</p>
        )}
      </div>

      {/* Status + Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {statusBadge(file.status)}
        {file.status === "failed" && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => retryFileUpload(resourceId, file.id)}
            title="Retry upload"
          >
            <RotateCcw className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Batch Card ───────────────────────────────────────────────

function HistoryBatchCard({ batch }: { batch: UploadBatch }) {
  const completedCount = batch.files.filter(
    (f) => f.status === "completed"
  ).length
  const failedCount = batch.files.filter((f) => f.status === "failed").length
  const totalCount = batch.files.length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold">
              {batch.resourceTitle}
            </CardTitle>
            <CardDescription className="text-xs">
              {completedCount}/{totalCount} uploaded
              {failedCount > 0 && (
                <span className="ml-1 font-medium text-destructive">
                  · {failedCount} failed
                </span>
              )}
              <span className="ml-2 text-muted-foreground/60">
                {formatRelativeTime(batch.createdAt)}
              </span>
            </CardDescription>
          </div>
          {failedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => retryBatchFailedUploads(batch.resourceId)}
            >
              <RotateCcw className="size-3" />
              Retry All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border/50">
          {batch.files.map((file) => (
            <HistoryFileRow
              key={file.id}
              file={file}
              resourceId={batch.resourceId}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Export ───────────────────────────────────────────────

export function UploadHistory() {
  const batches = useUploadStore((s) => s.batches)

  if (batches.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
            <File className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            No uploads yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Upload history will appear here when you create tutorials or
            resources with files.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {batches.map((batch) => (
        <HistoryBatchCard key={batch.resourceId} batch={batch} />
      ))}
    </div>
  )
}
