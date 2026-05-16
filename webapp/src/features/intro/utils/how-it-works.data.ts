import type { LucideIcon } from "lucide-react"

import type {
  HowItWorksData,
  HowItWorksStep,
} from "@/features/intro/services/intro.service"
import { resolveIcon } from "@/lib/icon-resolver"

/* ------------------------------------------------------------------ */
/*  Hydrated Types                                                     */
/* ------------------------------------------------------------------ */

export type HydratedStep = Omit<HowItWorksStep, "iconKey"> & {
  icon: LucideIcon
}

export type HydratedHowItWorksData = {
  learnerSteps: HydratedStep[]
  creatorSteps: HydratedStep[]
}

/* ------------------------------------------------------------------ */
/*  Hydration logic                                                    */
/* ------------------------------------------------------------------ */

export function hydrateHowItWorksData({
  learnerSteps,
  creatorSteps,
}: HowItWorksData): HydratedHowItWorksData {
  return {
    learnerSteps: learnerSteps.map((step) => ({
      ...step,
      icon: resolveIcon(step.iconKey),
    })),
    creatorSteps: creatorSteps.map((step) => ({
      ...step,
      icon: resolveIcon(step.iconKey),
    })),
  }
}
