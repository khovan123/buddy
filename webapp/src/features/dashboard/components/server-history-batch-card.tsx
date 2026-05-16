import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { UploadHistoryItem } from "@/features/dashboard/services/dashboard.service"

import { ServerHistoryFileRow } from "./server-history-file-row"

export function ServerHistoryBatchCard({
  title,
  files,
}: {
  title: string
  files: UploadHistoryItem[]
}) {
  const availableCount = files.filter((f) => f.status === "AVAILABLE").length
  const failedCount = files.filter((f) => f.status === "FAILED").length
  const totalCount = files.length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            <CardDescription className="text-xs">
              {availableCount}/{totalCount} available
              {failedCount > 0 && (
                <span className="ml-1 font-medium text-destructive">
                  · {failedCount} failed
                </span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border/50">
          {files.map((file) => (
            <ServerHistoryFileRow key={file.id} file={file} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
