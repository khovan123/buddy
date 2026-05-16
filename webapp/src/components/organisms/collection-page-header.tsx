import { LibraryBackButton } from "@/components/atoms/library-back-button"
import { MetaChip } from "@/components/atoms/meta-chip"
import { cn } from "@/lib/utils"

type CollectionPageHeaderProps = {
  backHref?: string
  backLabel?: string
  badge?: string
  title: string
  progressLabel?: string
  progressPercent?: number
  sticky?: boolean
  rightSlot?: React.ReactNode
}

export function CollectionPageHeader({
  backHref = "/library",
  backLabel = "Back to library",
  badge,
  title,
  progressLabel,
  progressPercent,
  sticky = false,
  rightSlot,
}: CollectionPageHeaderProps) {
  const normalizedPercent = Math.max(
    0,
    Math.min(100, Math.round(progressPercent ?? 0))
  )

  return (
    <header
      className={cn(
        "border-outline-variant/20 z-20 flex h-16 items-center justify-between gap-4 border-b bg-background/90 backdrop-blur",
        sticky ? "sticky top-0" : undefined
      )}
    >
      <LibraryBackButton
        fallbackHref={backHref}
        label={backLabel}
        variant="ghost"
        size="sm"
      />

      <div className="hidden items-center gap-2 md:flex">
        {badge ? <MetaChip>{badge}</MetaChip> : null}
        <span className="font-bold tracking-tight text-primary">{title}</span>
      </div>

      <div className="flex items-center gap-4">
        {progressLabel ? (
          <div className="hidden min-w-40 space-y-1 sm:block">
            <div className="text-2xs flex items-center justify-between font-bold tracking-widest text-muted-foreground uppercase">
              <span>{progressLabel}</span>
              <span className="text-primary">{normalizedPercent}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${normalizedPercent}%` }}
              />
            </div>
          </div>
        ) : null}

        {rightSlot}
      </div>
    </header>
  )
}
