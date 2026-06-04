import { AlertCircle, Check, Clock, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { UploadFileStatus } from "@/features/content/types"

export function UploadStatusBadge({ status }: { status: UploadFileStatus }) {
  switch (status) {
    case "PENDING":
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <Clock className="size-3" />
          Pending
        </Badge>
      )
    case "PROCESSING":
      return (
        <Badge
          variant="outline"
          className="gap-1 border-primary/30 text-primary"
        >
          <Loader2 className="size-3 animate-spin" />
          Processing
        </Badge>
      )
    case "AVAILABLE":
      return (
        <Badge
          variant="outline"
          className="gap-1 border-emerald-500/30 text-emerald-600"
        >
          <Check className="size-3" />
          Available
        </Badge>
      )
    case "FAILED":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="size-3" />
          Failed
        </Badge>
      )
  }
}
