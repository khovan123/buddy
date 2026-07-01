"use client"

import type { ReactNode } from "react"

import Link from "next/link"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Check, Crown, Minus, Palette } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatVND } from "@/features/billing/types/billing-types"
import type { PlanFeature } from "@/features/intro/services/intro.service"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Plan Card molecule                                                 */
/* ------------------------------------------------------------------ */

interface PlanTier {
  price: number
  label: string
  cta: string
  description: string
  yearlyPrice?: number
  badge?: string
}

export function PlanCard({
  plan,
  features,
  isPro,
  yearly,
  audienceIcon: AudienceIcon,
  action,
  className,
}: {
  plan: PlanTier
  features: PlanFeature[]
  isPro: boolean
  yearly: boolean
  audienceIcon: typeof Palette
  action?: ReactNode
  className?: string
}) {
  const proplan = plan as PlanTier & { yearlyPrice: number; badge: string }
  const price = isPro && yearly ? proplan.yearlyPrice : plan.price

  return (
    <Card
      className={cn(
        "relative min-w-96 gap-0 overflow-visible rounded-2xl border py-0 shadow-none transition-all duration-300",
        isPro
          ? "border-pricing-accent/40 bg-linear-to-b from-pricing-accent-muted to-transparent shadow-lg shadow-pricing-accent/5"
          : "border-border bg-pricing-surface-alt",
        className
      )}
    >
      {isPro && proplan.badge && (
        <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
          <Badge className="rounded-full bg-pricing-accent px-4 py-1 text-xs font-semibold text-pricing-accent-foreground">
            {proplan.badge}
          </Badge>
        </div>
      )}

      <CardHeader className="rounded-none px-8 pt-8 pb-0">
        <div className="mb-1 flex items-center gap-2">
          {isPro ? (
            <Crown className="size-5 text-pricing-accent" />
          ) : (
            <AudienceIcon className="size-5 text-muted-foreground" />
          )}
          <CardTitle className="text-lg font-semibold text-foreground">
            {plan.label}
          </CardTitle>
        </div>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="px-8 pt-6 pb-0">
        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <AnimatePresence mode="wait">
              <motion.span
                key={price}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="text-4xl font-bold text-foreground"
              >
                {formatVND(price)}
              </motion.span>
            </AnimatePresence>
            <span className="text-muted-foreground">/ month</span>
          </div>
          {isPro && yearly && (
            <p className="mt-1 text-xs text-pricing-success">
              Billed {formatVND((proplan.yearlyPrice ?? 0) * 12)}/year
            </p>
          )}
        </div>

        {action ?? (
          <Button
            asChild
            size="lg"
            className={cn(
              "mb-6 w-full rounded-full",
              isPro
                ? "bg-foreground text-background hover:bg-foreground/90"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            <Link href="/sign-up">
              {plan.cta} <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        )}

        <Separator className="mb-4" />

        {/* Feature list */}
        <div className="space-y-3 pb-8">
          {features.map((feature) => {
            const value = isPro ? feature.pro : feature.free
            return (
              <div
                key={feature.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{feature.label}</span>
                {typeof value === "boolean" ? (
                  value ? (
                    <Check className="size-4 text-pricing-success" />
                  ) : (
                    <Minus className="size-4 text-muted-foreground/30" />
                  )
                ) : (
                  <span className="font-medium text-foreground/90">
                    {value}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
