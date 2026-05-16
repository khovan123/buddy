import type { LucideIcon } from "lucide-react"

import type {
  LandingData,
  LandingFeature,
  LandingStat,
} from "@/features/intro/services/intro.service"
import { resolveIcon } from "@/lib/icon-resolver"

/* ------------------------------------------------------------------ */
/*  Hydrated types (with resolved icon components)                     */
/* ------------------------------------------------------------------ */

export interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

export interface Stat {
  value: string
  label: string
  icon: LucideIcon
}

/* ------------------------------------------------------------------ */
/*  Hydrate service data with icon components                          */
/* ------------------------------------------------------------------ */

export function hydrateLandingData(data: LandingData) {
  return {
    features: data.features.map(
      (f: LandingFeature): Feature => ({
        icon: resolveIcon(f.iconKey),
        title: f.title,
        description: f.description,
      })
    ),
    stats: data.stats.map(
      (s: LandingStat): Stat => ({
        value: s.value,
        label: s.label,
        icon: resolveIcon(s.iconKey),
      })
    ),
    useCases: data.useCases,
    testimonials: data.testimonials,
  }
}
