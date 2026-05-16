import type { LucideIcon } from "lucide-react"

import type {
  PlanGroup,
  PricingData,
} from "@/features/intro/services/intro.service"
import { resolveIcon } from "@/lib/icon-resolver"

/* ------------------------------------------------------------------ */
/*  Re-export serializable types                                       */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Hydrated plan group (with resolved icon component)                 */
/* ------------------------------------------------------------------ */

export type HydratedPlanGroup = Omit<PlanGroup, "iconKey"> & {
  icon: LucideIcon
}

/* ------------------------------------------------------------------ */
/*  Hydrate service data with icon components                          */
/* ------------------------------------------------------------------ */

export function hydratePricingData(data: PricingData) {
  const hydratePlanGroup = (group: PlanGroup): HydratedPlanGroup => ({
    ...group,
    icon: resolveIcon(group.iconKey),
  })

  return {
    creatorPlans: hydratePlanGroup(data.creatorPlans),
    studentPlans: hydratePlanGroup(data.studentPlans),
    comparisonCategories: data.comparisonCategories,
    faqItems: data.faqItems,
  }
}
