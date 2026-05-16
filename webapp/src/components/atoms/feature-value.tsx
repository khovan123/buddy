import { Check, Minus } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Feature value indicator atom                                       */
/* ------------------------------------------------------------------ */

export function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return <Check className="size-4 text-pricing-success" />
  }
  if (value === false) {
    return <Minus className="size-4 text-muted-foreground/30" />
  }
  return <span className="text-sm text-foreground/80">{value}</span>
}
