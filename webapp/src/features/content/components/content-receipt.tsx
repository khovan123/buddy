import { Clock3, FileText, Layers3, ReceiptText } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { LearningFit } from "../types"

interface ContentReceiptProps {
  fit?: LearningFit | null
  fileCount?: number
  updatedAt?: string
  label?: string
}

export function ContentReceipt({
  fit,
  fileCount,
  updatedAt,
  label = "Value receipt",
}: ContentReceiptProps) {
  if (!fit && !fileCount && !updatedAt) {
    return null
  }

  const updated = updatedAt
    ? new Date(updatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ReceiptText className="h-4 w-4 text-primary" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {typeof fileCount === "number" ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            {fileCount} included item{fileCount === 1 ? "" : "s"}
          </div>
        ) : null}
        {fit?.estimatedStudyTimeMinutes ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            About {fit.estimatedStudyTimeMinutes} min study time
          </div>
        ) : null}
        {fit?.coveredTopics?.length ? (
          <div className="flex items-start gap-2 text-muted-foreground">
            <Layers3 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{fit.coveredTopics.slice(0, 4).join(", ")}</span>
          </div>
        ) : null}
        {updated ? (
          <div className="text-xs text-muted-foreground">Updated {updated}</div>
        ) : null}
      </CardContent>
    </Card>
  )
}
