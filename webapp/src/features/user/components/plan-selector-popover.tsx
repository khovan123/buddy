"use client"

import { useState } from "react"

import { Check, Crown, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  useCreateSubscriptionMutation,
  useGetSubscriptionQuery,
} from "@/features/billing/services/billing-api"
import {
  PLAN_DISPLAY_NAMES,
  PLAN_LIMITS,
  type SubscriptionPlan,
} from "@/features/billing/types/billing-types"
import { cn } from "@/lib/utils"
import { extractApiError } from "@/types/api"

const PLAN_OPTIONS: SubscriptionPlan[] = [
  "CREATOR_FREE",
  "CREATOR_PRO",
  "STUDENT_FREE",
  "STUDENT_PRO",
]

function formatLimit(value: number): string {
  return value === -1 ? "Unlimited" : String(value)
}

function getPlanSummary(plan: SubscriptionPlan): string {
  const limits = PLAN_LIMITS[plan]

  if (plan.startsWith("CREATOR")) {
    return `${formatLimit(limits.maxResources)} resources - ${formatLimit(
      limits.maxTutorials
    )} tutorials`
  }

  return `${formatLimit(limits.maxSearchResults)} search results - ${Math.round(
    limits.storageBytes / (1024 * 1024 * 1024)
  )} GB storage`
}

export function PlanSelectorPopover() {
  const [open, setOpen] = useState(false)
  const { data, isFetching } = useGetSubscriptionQuery()
  const [createSubscription, { isLoading }] = useCreateSubscriptionMutation()

  const currentPlan = data?.data?.plan
  const triggerLabel = currentPlan
    ? PLAN_DISPLAY_NAMES[currentPlan]
    : isFetching
      ? "Loading plan"
      : "No Plan"

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (plan === currentPlan || isLoading) {
      return
    }

    try {
      await createSubscription({ plan }).unwrap()
      toast.success(`${PLAN_DISPLAY_NAMES[plan]} is now active.`)
      setOpen(false)
    } catch (error) {
      toast.error(extractApiError(error))
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="hidden min-w-28 font-semibold md:inline-flex"
          aria-label="Choose subscription plan"
        >
          {isFetching ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-3 p-3">
        <PopoverHeader className="px-1">
          <PopoverTitle className="text-sm font-semibold">
            Subscription plan
          </PopoverTitle>
          <PopoverDescription className="text-xs">
            Choose the plan used for content limits and search access.
          </PopoverDescription>
        </PopoverHeader>

        <div className="grid gap-2">
          {PLAN_OPTIONS.map((plan) => {
            const active = plan === currentPlan
            const pro = plan.endsWith("_PRO")
            const disabled = active || isLoading

            return (
              <button
                key={plan}
                type="button"
                disabled={disabled}
                onClick={() => void handleSelectPlan(plan)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                  "hover:border-primary/30 hover:bg-secondary/60",
                  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
                  "disabled:cursor-default disabled:opacity-100",
                  active
                    ? "border-primary/30 bg-secondary/80"
                    : "border-border/70 bg-background"
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl",
                    pro
                      ? "bg-amber-500/12 text-amber-700 dark:text-amber-300"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {pro ? (
                    <Crown className="size-4" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">
                      {PLAN_DISPLAY_NAMES[plan]}
                    </span>
                    {active ? (
                      <Badge variant="secondary" className="h-5 gap-1">
                        <Check className="size-3" />
                        Active
                      </Badge>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {getPlanSummary(plan)}
                  </span>
                </span>

                {isLoading && !active ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                ) : null}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
