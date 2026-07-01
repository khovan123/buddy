import { useI18n } from "@/i18n/language-provider"
import { cn } from "@/lib/utils"

export type CardPriceData = {
  originalPrice: string
  discountLabel?: string
  finalPrice?: string
}

type CardPriceProps = {
  price?: string
  pricing?: CardPriceData
  align?: "start" | "end"
  compact?: boolean
}

export function CardPrice({
  price,
  pricing,
  align = "end",
  compact = false,
}: CardPriceProps) {
  const { t } = useI18n()
  const originalPrice = pricing?.originalPrice ?? price ?? "—"
  const finalPrice = pricing?.finalPrice
  const discountLabel = pricing?.discountLabel
  const hasDiscount = Boolean(discountLabel && finalPrice)
  const freeLabel = t("common.free")
  const isFreePrice = (value?: string) => {
    const normalized = value?.trim().toLowerCase()
    return normalized === "free" || value === freeLabel
  }
  const displayPrice = (value: string) => (isFreePrice(value) ? freeLabel : value)

  if (!hasDiscount) {
    return (
      <span
        className={cn(
          "tracking-normal text-foreground",
          compact
            ? "rounded-full border border-border/70 bg-background/50 px-2 py-0.5"
            : "text-4xl font-extrabold"
        )}
      >
        {displayPrice(originalPrice)}
      </span>
    )
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1",
        align === "end" ? "items-end text-right" : "items-start text-left"
      )}
    >
      <div className="flex max-w-full flex-wrap items-center justify-end gap-1.5">
        <span
          className={cn(
            "tracking-normal text-primary",
            compact
              ? "rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5"
              : "text-4xl font-extrabold"
          )}
        >
          {displayPrice(finalPrice!)}
        </span>
        {!isFreePrice(finalPrice) && (
          <span className="rounded-full border border-education-gold/25 bg-education-gold/18 px-2 py-0.5 tracking-normal text-foreground">
            {discountLabel}
          </span>
        )}
      </div>
      {!isFreePrice(finalPrice) && (
        <span
          className={cn(
            "leading-none text-muted-foreground line-through",
            compact ? "text-3xs" : "text-xs"
          )}
        >
          {displayPrice(originalPrice)}
        </span>
      )}
    </div>
  )
}
