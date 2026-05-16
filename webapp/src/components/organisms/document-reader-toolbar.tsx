import { Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

type DocumentReaderToolbarProps = {
  sourceLabel: string
  pageCountHint: string
  fontScale: number
  canScaleContent: boolean
  onDecreaseFont: () => void
  onIncreaseFont: () => void
}

export function DocumentReaderToolbar({
  sourceLabel,
  pageCountHint,
  fontScale,
  canScaleContent,
  onDecreaseFont,
  onIncreaseFont,
}: DocumentReaderToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
        <span>{sourceLabel}</span>
        <span>•</span>
        <span>{pageCountHint}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onDecreaseFont}
          aria-label="Decrease text size"
          disabled={!canScaleContent}
        >
          <Minus className="size-4" />
        </Button>
        <div className="min-w-14 rounded-md border border-border/60 px-3 py-2 text-center text-xs font-semibold text-foreground">
          {Math.round(fontScale * 100)}%
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onIncreaseFont}
          aria-label="Increase text size"
          disabled={!canScaleContent}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  )
}
