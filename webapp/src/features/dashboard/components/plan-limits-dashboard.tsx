"use client"

import { useMemo, useState, useTransition } from "react"

import { Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

import { savePlanLimitsAction } from "../actions/plan-limits-actions"
import type {
  PlanLimits,
  SubscriptionPlanCatalogItem,
  SubscriptionPlanCode,
} from "../services/plan-limits.service"

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
  key: Exclude<keyof PlanLimits, "canCreateContent">
  label: string
  min: number
  step?: number
}> = [
  { key: "storageBytes", label: "Storage bytes", min: 0, step: 1048576 },
  { key: "maxResources", label: "Resources", min: -1 },
  { key: "maxTutorials", label: "Tutorials", min: -1 },
  { key: "maxCollections", label: "Collections", min: -1 },
  { key: "maxSearchResults", label: "Search results", min: -1 },
]

export function PlanLimitsDashboard({ plans }: PlanLimitsDashboardProps) {
  const initialValues = useMemo(
    () =>
      Object.fromEntries(plans.map((plan) => [plan.code, plan.limits])) as Record<
        SubscriptionPlanCode,
        PlanLimits
      >,
    [plans]
  )
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
        [key]: value,
      },
    }))
  }

  const save = (code: SubscriptionPlanCode) => {
    setSavingCode(code)
    startTransition(async () => {
      const result = await savePlanLimitsAction(code, values[code])
      setSavingCode(null)

      if (result.ok) {
        toast.success("Plan limits saved")
        return
      }

      toast.error("Could not save plan limits")
    })
  }

  if (plans.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h1 className="text-lg font-semibold">Plan limits</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No subscription plans were returned by billing-service.
        </p>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-normal">Plan limits</h1>
        <p className="text-sm text-muted-foreground">
          Control the quantitative limits stored in the billing plan catalog.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {plans.map((plan) => {
          const limits = values[plan.code] ?? plan.limits
          const isSaving = isPending && savingCode === plan.code

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
                  Save
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {LIMIT_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={`${plan.code}-${field.key}`}>
                      {field.label}
                    </Label>
                    <Input
                      id={`${plan.code}-${field.key}`}
                      type="number"
                      min={field.min}
                      step={field.step ?? 1}
                      value={limits[field.key]}
                      onChange={(event) =>
                        updateLimit(
                          plan.code,
                          field.key,
                          Number(event.target.value)
                        )
                      }
                    />
                  </div>
                ))}

                <div className="flex min-h-16 items-center justify-between gap-3 rounded-md border px-3">
                  <div>
                    <Label htmlFor={`${plan.code}-canCreateContent`}>
                      Create content
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Updates the catalog flag for creator access.
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
