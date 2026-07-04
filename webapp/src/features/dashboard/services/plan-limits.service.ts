import { isDynamicServerError } from "next/dist/client/components/hooks-server-context"

import { fetchApi } from "@/lib/fetch"
import { getAuthHeaders } from "@/lib/server-session"
import type { ApiResponse } from "@/types/api"

export type SubscriptionPlanCode =
  | "CREATOR_FREE"
  | "CREATOR_PRO"
  | "STUDENT_FREE"
  | "STUDENT_PRO"

export type PlanLimits = {
  storageBytes: number
  maxResources: number
  maxTutorials: number
  maxCollections: number
  canCreateContent: boolean
  maxSearchResults: number
}

export type PlanPricing = {
  monthlyPriceCents: number
  yearlyMonthlyPriceCents?: number | null
  currency: string
}

export type PlanSettings = {
  limits: PlanLimits
  pricing: PlanPricing
}

export type SubscriptionPlanCatalogItem = {
  code: SubscriptionPlanCode
  audience: "CREATOR" | "STUDENT"
  tier: string
  pricing: PlanPricing
  limits: PlanLimits
  pbac: Record<string, unknown>
}

type SubscriptionPlanCatalogResponse = {
  planCatalog?: SubscriptionPlanCatalogItem[]
}

export async function getSubscriptionPlanCatalog(): Promise<
  SubscriptionPlanCatalogItem[]
> {
  try {
    const res = await fetchApi(
      "GET",
      "/billing/subscription/plans",
      undefined,
      undefined,
      false,
      { cache: "no-store" }
    )

    if (!res.ok) {
      return []
    }

    const json =
      (await res.json()) as ApiResponse<SubscriptionPlanCatalogResponse>
    return json.data?.planCatalog ?? []
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch subscription plan catalog:", error)
    return []
  }
}

export async function updateSubscriptionPlanLimits(
  code: SubscriptionPlanCode,
  settings: PlanSettings
): Promise<boolean> {
  try {
    const headers = await getAuthHeaders()
    const res = await fetchApi(
      "PUT",
      `/billing/subscription/plans/${code}/limits`,
      {
        ...settings.limits,
        monthlyPriceCents: settings.pricing.monthlyPriceCents,
        yearlyMonthlyPriceCents:
          settings.pricing.yearlyMonthlyPriceCents ?? null,
      },
      headers,
      false,
      { cache: "no-store" }
    )

    return res.ok
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error(`Failed to update subscription plan limits(${code}):`, error)
    return false
  }
}
