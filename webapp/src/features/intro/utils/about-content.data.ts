import type { LucideIcon } from "lucide-react"

import type {
  AboutData,
  AboutValue,
} from "@/features/intro/services/intro.service"
import { resolveIcon } from "@/lib/icon-resolver"

/* ------------------------------------------------------------------ */
/*  Hydrated types (with resolved icon components)                     */
/* ------------------------------------------------------------------ */

export interface Value {
  icon: LucideIcon
  title: string
  description: string
}

/* ------------------------------------------------------------------ */
/*  Hydrate service data with icon components                          */
/* ------------------------------------------------------------------ */

export function hydrateAboutData(data: AboutData) {
  return {
    values: data.values.map(
      (v: AboutValue): Value => ({
        icon: resolveIcon(v.iconKey),
        title: v.title,
        description: v.description,
      })
    ),
    team: data.team,
    advisors: data.advisors,
    milestones: data.milestones,
    offices: data.offices,
  }
}
