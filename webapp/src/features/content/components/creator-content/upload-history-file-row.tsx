import { FileText } from "lucide-react"

import type { UploadHistoryItem } from "@/features/content/types"
import { formatFileSize } from "@/features/content/utils/formatters"

import { RelativeTime } from "./relative-time"
import { UploadStatusBadge } from "./upload-status-badge"

export function UploadHistoryFileRow({ file }: { file: UploadHistoryItem }) {
  return (
    <div className="group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <FileText className="size-4 text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.originalFilename}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(file.fileSizeBytes)}</span>
          {file.mimeType && (
            <>
              <span className="text-border">·</span>
              <span>{file.mimeType}</span>
            </>
          )}
          <span className="text-border">·</span>
          <span>
            <RelativeTime date={file.createdAt} />
          </span>
        </div>

        {file.status === "FAILED" && file.processingError && (
          <p className="mt-1 text-xs text-destructive">
            {file.processingError}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <UploadStatusBadge status={file.status} />
      </div>
    </div>
  )
}
