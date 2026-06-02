"use client"

import type { ComponentProps } from "react"
import { useState } from "react"

import { Check, Loader2, Palette, Users } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  useCreateSubscriptionMutation,
  useGetSubscriptionPlansQuery,
  useGetSubscriptionQuery,
} from "@/features/billing/services/billing-api"
import {
  PLAN_DISPLAY_NAMES,
  type SubscriptionPlan,
  type SubscriptionPricingData,
} from "@/features/billing/types/billing-types"
import { PlanCard } from "@/features/intro/components/plan-card"
import type {
  PlanFeature,
  PlanTier,
} from "@/features/intro/services/intro.service"
import { cn } from "@/lib/utils"
import { extractApiError } from "@/types/api"

type PlanAudience = "student" | "creator"

type PlanCardOption = {
  code: SubscriptionPlan
  audience: PlanAudience
  plan: PlanTier
  features: PlanFeature[]
  isPro: boolean
  audienceIcon: typeof Palette
}

type PlanSelectorDialogProps = {
  triggerClassName?: string
  triggerSize?: ComponentProps<typeof Button>["size"]
  triggerText?: string
  triggerVariant?: ComponentProps<typeof Button>["variant"]
}

function getPlanCards(
  data: SubscriptionPricingData | undefined
): PlanCardOption[] {
  if (!data) {
    return []
  }

  return [
    {
      code: "CREATOR_FREE",
      audience: "creator",
      plan: data.creatorPlans.free,
      features: data.creatorPlans.features,
      isPro: false,
      audienceIcon: Palette,
    },
    {
      code: "CREATOR_PRO",
      audience: "creator",
      plan: data.creatorPlans.pro,
      features: data.creatorPlans.features,
      isPro: true,
      audienceIcon: Palette,
    },
    {
      code: "STUDENT_FREE",
      audience: "student",
      plan: data.studentPlans.free,
      features: data.studentPlans.features,
      isPro: false,
      audienceIcon: Users,
    },
    {
      code: "STUDENT_PRO",
      audience: "student",
      plan: data.studentPlans.pro,
      features: data.studentPlans.features,
      isPro: true,
      audienceIcon: Users,
    },
  ]
}

export function PlanSelectorDialog({
  triggerClassName = "hidden min-w-28 font-semibold md:inline-flex",
  triggerSize = "sm",
  triggerText,
  triggerVariant = "secondary",
}: PlanSelectorDialogProps = {}) {
  const [open, setOpen] = useState(false)
  const [selectedAudience, setSelectedAudience] =
    useState<PlanAudience>("student")
  const [pendingPlan, setPendingPlan] = useState<SubscriptionPlan | null>(null)
  const { data, isFetching } = useGetSubscriptionQuery()
  const { data: plansData, isFetching: isPlansFetching } =
    useGetSubscriptionPlansQuery()
  const [createSubscription, { isLoading }] = useCreateSubscriptionMutation()

  const currentPlan = data?.data?.plan
  const requiresPlanSelection = !isFetching && !currentPlan
  const currentAudience: PlanAudience = currentPlan?.startsWith("CREATOR")
    ? "creator"
    : "student"
  const planCards = getPlanCards(plansData?.data)
  const visiblePlanCards = planCards.filter(
    (card) => card.audience === selectedAudience
  )
  const triggerLabel =
    triggerText ??
    (isFetching
      ? "Plans"
      : currentPlan
        ? PLAN_DISPLAY_NAMES[currentPlan]
        : "Choose plan")

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && requiresPlanSelection) {
      return
    }

    if (nextOpen) {
      setSelectedAudience(currentAudience)
    }

    setOpen(nextOpen)
  }

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (plan === currentPlan || isLoading) {
      return
    }

    try {
      setPendingPlan(plan)
      await createSubscription({ plan }).unwrap()
      toast.success(`${PLAN_DISPLAY_NAMES[plan]} is now active.`)
      setOpen(false)
    } catch (error) {
      toast.error(extractApiError(error))
    } finally {
      setPendingPlan(null)
    }
  }

  return (
    <Dialog open={open || requiresPlanSelection} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerSize}
          className={triggerClassName}
          aria-label="Choose subscription plan"
        >
          {isFetching ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:max-w-6xl sm:p-6">
        <DialogHeader className="pr-10">
          <DialogTitle>Subscription plan</DialogTitle>
          <DialogDescription>
            {requiresPlanSelection
              ? "Select a plan to continue."
              : "Choose the plan used for content limits and search access."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 rounded-full bg-secondary p-1 sm:w-fit">
          <Button
            type="button"
            variant={selectedAudience === "student" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedAudience("student")}
            className="rounded-full"
          >
            <Users className="size-4" />
            Student
          </Button>
          <Button
            type="button"
            variant={selectedAudience === "creator" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedAudience("creator")}
            className="rounded-full"
          >
            <Palette className="size-4" />
            Creator
          </Button>
        </div>

        {isPlansFetching && planCards.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : planCards.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            Subscription plans are unavailable right now.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visiblePlanCards.map((card) => {
              const active = card.code === currentPlan
              const submitting = pendingPlan === card.code
              const disabled = active || isLoading

              return (
                <PlanCard
                  key={card.code}
                  plan={{
                    ...card.plan,
                    badge: active ? "Active" : card.plan.badge,
                  }}
                  features={card.features}
                  isPro={card.isPro}
                  yearly={false}
                  audienceIcon={card.audienceIcon}
                  className={cn(
                    "min-w-0 rounded-xl",
                    active && "ring-2 ring-primary/35"
                  )}
                  action={
                    <Button
                      type="button"
                      size="lg"
                      disabled={disabled}
                      onClick={() => void handleSelectPlan(card.code)}
                      className={cn(
                        "mb-6 w-full rounded-full",
                        card.isPro
                          ? "bg-foreground text-background hover:bg-foreground/90"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      )}
                    >
                      {submitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : active ? (
                        <Check className="size-4" />
                      ) : null}
                      {active ? "Active plan" : card.plan.cta}
                    </Button>
                  }
                />
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export const PlanSelectorPopover = PlanSelectorDialog
