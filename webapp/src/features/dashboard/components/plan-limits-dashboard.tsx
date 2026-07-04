"use client"

import { useMemo, useState, useTransition } from "react"

import { Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useI18n } from "@/i18n/language-provider"

import { savePlanLimitsAction } from "../actions/plan-limits-actions"
import type {
  PlanLimits,
  PlanPricing,
  PlanSettings,
  SubscriptionPlanCatalogItem,
  SubscriptionPlanCode,
} from "../services/plan-limits.service"
import { formatFileSize } from "../utils/formatters"

type PlanLimitsDashboardProps = {
  plans: SubscriptionPlanCatalogItem[]
}

const PLAN_LABELS: Record<SubscriptionPlanCode, string> = {
  CREATOR_FREE: "Creator Free",
  CREATOR_PRO: "Creator Pro",
  STUDENT_FREE: "Student Free",
  STUDENT_PRO: "Student Pro",
}

const LIMIT_FIELDS: Array<{
  key: Exclude<keyof PlanLimits, "canCreateContent" | "storageBytes">
  min: number
  step?: number
}> = [
  { key: "maxResources", min: -1 },
  { key: "maxTutorials", min: -1 },
  { key: "maxCollections", min: -1 },
  { key: "maxSearchResults", min: -1 },
]

const STORAGE_PRESETS = [
  100 * 1024 * 1024,
  250 * 1024 * 1024,
  500 * 1024 * 1024,
  1024 * 1024 * 1024,
  5 * 1024 * 1024 * 1024,
  10 * 1024 * 1024 * 1024,
  50 * 1024 * 1024 * 1024,
  100 * 1024 * 1024 * 1024,
]

function getStorageOptions(currentValue: number) {
  const options = new Set(STORAGE_PRESETS)

  if (currentValue > 0) {
    options.add(currentValue)
  }

  return Array.from(options)
    .sort((a, b) => a - b)
    .map((value) => ({
      value: String(value),
      label: formatFileSize(value),
    }))
}

function isUnlimited(value: number) {
  return value === -1
}

function getLimitedValue(value: number) {
  return value > 0 ? value : 1
}

function getInitialPlanSettings(
  plans: SubscriptionPlanCatalogItem[]
): Record<SubscriptionPlanCode, PlanSettings> {
  return Object.fromEntries(
    plans.map((plan) => [
      plan.code,
      {
        limits: plan.limits,
        pricing: plan.pricing ?? {
          monthlyPriceCents: 0,
          yearlyMonthlyPriceCents: null,
          currency: "VND",
        },
      },
    ])
  ) as Record<SubscriptionPlanCode, PlanSettings>
}

function centsToInputValue(cents?: number | null) {
  return cents === null || cents === undefined ? "" : String(cents / 100)
}

function inputValueToCents(value: string) {
  return Math.max(0, Math.round((Number(value) || 0) * 100))
}

export function PlanLimitsDashboard({ plans }: PlanLimitsDashboardProps) {
  const { t } = useI18n()

  const initialValues = useMemo(() => getInitialPlanSettings(plans), [plans])
  const [values, setValues] = useState(initialValues)
  const [savingCode, setSavingCode] = useState<SubscriptionPlanCode | null>(null)
  const [isPending, startTransition] = useTransition()

  const updateLimit = (
    code: SubscriptionPlanCode,
    key: keyof PlanLimits,
    value: number | boolean
  ) => {
    setValues((current) => ({
      ...current,
      [code]: {
        ...current[code],
        limits: {
          ...current[code].limits,
          [key]: value,
        },
      },
    }))
  }

  const updatePricing = (
    code: SubscriptionPlanCode,
    key: Exclude<keyof PlanPricing, "currency">,
    value: number | null
  ) => {
    setValues((current) => ({
      ...current,
      [code]: {
        ...current[code],
        pricing: {
          ...current[code].pricing,
          [key]: value,
        },
      },
    }))
  }

  const save = (code: SubscriptionPlanCode) => {
    setSavingCode(code)
    startTransition(async () => {
      const result = await savePlanLimitsAction(code, values[code])
      setSavingCode(null)

      if (result.ok) {
        toast.success(t("dashboard.planLimits.saveSuccess"))
        return
      }

      toast.error(t("dashboard.planLimits.saveError"))
    })
  }

  if (plans.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h1 className="text-lg font-semibold">
          {t("dashboard.planLimits.emptyTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("dashboard.planLimits.emptyDescription")}
        </p>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-normal">
          {t("dashboard.planLimits.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.planLimits.description")}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {plans.map((plan) => {
          const settings =
            values[plan.code] ??
            ({
              limits: plan.limits,
              pricing: plan.pricing ?? {
                monthlyPriceCents: 0,
                yearlyMonthlyPriceCents: null,
                currency: "VND",
              },
            } satisfies PlanSettings)
          const { limits, pricing } = settings
          const isSaving = isPending && savingCode === plan.code
          const storageOptions = getStorageOptions(limits.storageBytes)

          return (
            <form
              key={plan.code}
              className="rounded-lg border bg-background p-4"
              onSubmit={(event) => {
                event.preventDefault()
                save(plan.code)
              }}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold">
                    {PLAN_LABELS[plan.code]}
                  </h2>
                  <p className="text-xs uppercase text-muted-foreground">
                    {plan.audience} / {plan.tier}
                  </p>
                </div>
                <Button size="sm" type="submit" disabled={isSaving}>
                  <Save className="size-4" />
                  {t("common.save")}
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`${plan.code}-price`}>
                    {t("dashboard.planLimits.monthlyPrice")}
                  </Label>
                  <Input
                    id={`${plan.code}-price`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={centsToInputValue(pricing.monthlyPriceCents)}
                    onChange={(event) =>
                      updatePricing(
                        plan.code,
                        "monthlyPriceCents",
                        inputValueToCents(event.target.value)
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.planLimits.priceHint")}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`${plan.code}-yearlyPrice`}>
                    {t("dashboard.planLimits.yearlyMonthlyPrice")}
                  </Label>
                  <Input
                    id={`${plan.code}-yearlyPrice`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={centsToInputValue(pricing.yearlyMonthlyPriceCents)}
                    onChange={(event) =>
                      updatePricing(
                        plan.code,
                        "yearlyMonthlyPriceCents",
                        event.target.value === ""
                          ? null
                          : inputValueToCents(event.target.value)
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.planLimits.yearlyMonthlyPriceHint")}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`${plan.code}-storageBytes`}>
                    {t("dashboard.planLimits.storageBytes")}
                  </Label>
                  <Select
                    value={String(limits.storageBytes)}
                    onValueChange={(value) =>
                      updateLimit(plan.code, "storageBytes", Number(value))
                    }
                  >
                    <SelectTrigger
                      id={`${plan.code}-storageBytes`}
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {storageOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.planLimits.storageBytesHint")}
                  </p>
                </div>

                {LIMIT_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={`${plan.code}-${field.key}`}>
                      {t(`dashboard.planLimits.${field.key}` as const)}
                    </Label>
                    <div className="space-y-2">
                      <Select
                        value={
                          isUnlimited(limits[field.key]) ? "unlimited" : "limited"
                        }
                        onValueChange={(value) =>
                          updateLimit(
                            plan.code,
                            field.key,
                            value === "unlimited"
                              ? -1
                              : getLimitedValue(limits[field.key])
                          )
                        }
                      >
                        <SelectTrigger
                          id={`${plan.code}-${field.key}-mode`}
                          className="w-full"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="limited">
                            {t("dashboard.planLimits.limited")}
                          </SelectItem>
                          <SelectItem value="unlimited">
                            {t("dashboard.planLimits.unlimited")}
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {!isUnlimited(limits[field.key]) ? (
                        <Input
                          id={`${plan.code}-${field.key}`}
                          type="number"
                          min={1}
                          step={field.step ?? 1}
                          value={getLimitedValue(limits[field.key])}
                          onChange={(event) =>
                            updateLimit(
                              plan.code,
                              field.key,
                              Math.max(1, Number(event.target.value) || 1)
                            )
                          }
                        />
                      ) : null}
                    </div>
                  </div>
                ))}

                <div className="flex min-h-16 items-center justify-between gap-3 rounded-md border px-3">
                  <div>
                    <Label htmlFor={`${plan.code}-canCreateContent`}>
                      {t("dashboard.planLimits.createContent")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.planLimits.createContentHint")}
                    </p>
                  </div>
                  <Switch
                    id={`${plan.code}-canCreateContent`}
                    checked={limits.canCreateContent}
                    onCheckedChange={(checked) =>
                      updateLimit(plan.code, "canCreateContent", checked)
                    }
                  />
                </div>
              </div>
            </form>
          )
        })}
      </div>
    </section>
  )
}
