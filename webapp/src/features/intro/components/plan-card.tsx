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
import { formatCurrencyFromCents } from "@/features/billing/types/billing-types"
import type { PlanFeature } from "@/features/intro/services/intro.service"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Plan Card molecule                                                 */
/* ------------------------------------------------------------------ */

interface PlanTier {
  monthlyPriceCents: number
  priceInCents: number
  currency: string
  label: string
  cta: string
  description: string
  yearlyMonthlyPriceCents?: number
  badge?: string
}

type PlanCardVariant = "default" | "compact"

export function PlanCard({
  plan,
  features,
  isPro,
  yearly,
  audienceIcon: AudienceIcon,
  action,
  className,
  variant = "default",
}: {
  plan: PlanTier
  features: PlanFeature[]
  isPro: boolean
  yearly: boolean
  audienceIcon: typeof Palette
  action?: ReactNode
  className?: string
  variant?: PlanCardVariant
}) {
  const proplan = plan as PlanTier & {
    yearlyMonthlyPriceCents: number
    badge: string
  }
  const priceInCents =
    isPro && yearly
      ? proplan.yearlyMonthlyPriceCents
      : plan.priceInCents ?? plan.monthlyPriceCents
  const isCompact = variant === "compact"

  return (
    <Card
      className={cn(
        "relative gap-0 overflow-visible border py-0 shadow-none transition-all duration-300",
        isCompact ? "min-w-0 rounded-xl" : "min-w-96 rounded-2xl",
        isPro
          ? "border-pricing-accent/40 bg-linear-to-b from-pricing-accent-muted to-transparent shadow-lg shadow-pricing-accent/5"
          : "border-border bg-pricing-surface-alt",
        className
      )}
    >
      {isPro && proplan.badge && (
        <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
          <Badge
            className={cn(
              "rounded-full bg-pricing-accent font-semibold text-pricing-accent-foreground",
              isCompact ? "px-3 py-1 text-[11px]" : "px-4 py-1 text-xs"
            )}
          >
            {proplan.badge}
          </Badge>
        </div>
      )}

      <CardHeader
        className={cn(
          "rounded-none pb-0",
          isCompact ? "px-5 pt-6" : "px-8 pt-8"
        )}
      >
        <div className="mb-1 flex items-center gap-2">
          {isPro ? (
            <Crown
              className={cn(
                "text-pricing-accent",
                isCompact ? "size-4.5" : "size-5"
              )}
            />
          ) : (
            <AudienceIcon
              className={cn(
                "text-muted-foreground",
                isCompact ? "size-4.5" : "size-5"
              )}
            />
          )}
          <CardTitle
            className={cn(
              "font-semibold text-foreground",
              isCompact ? "text-base" : "text-lg"
            )}
          >
            {plan.label}
          </CardTitle>
        </div>
        <CardDescription className={cn(isCompact && "text-xs")}>
          {plan.description}
        </CardDescription>
      </CardHeader>

      <CardContent
        className={cn(isCompact ? "px-5 pt-4 pb-0" : "px-8 pt-6 pb-0")}
      >
        {/* Price */}
        <div className={cn(isCompact ? "mb-4" : "mb-6")}>
          <div className="flex items-baseline gap-1">
            <AnimatePresence mode="wait">
              <motion.span
                key={priceInCents}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={cn(
                  "font-bold text-foreground",
                  isCompact ? "text-2xl" : "text-4xl"
                )}
              >
                {formatCurrencyFromCents(priceInCents, plan.currency)}
              </motion.span>
            </AnimatePresence>
            <span
              className={cn(
                "text-muted-foreground",
                isCompact ? "text-xs" : "text-sm"
              )}
            >
              / month
            </span>
          </div>
          {isPro && yearly && (
            <p className="mt-1 text-xs text-pricing-success">
              Billed{" "}
              {formatCurrencyFromCents(
                (proplan.yearlyMonthlyPriceCents ?? 0) * 12,
                plan.currency
              )}
              /year
            </p>
          )}
        </div>

        {action ?? (
          <Button
            asChild
            size={isCompact ? "default" : "lg"}
            className={cn(
              "w-full rounded-full",
              isCompact ? "mb-4" : "mb-6",
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

        <Separator className={cn(isCompact ? "mb-3" : "mb-4")} />

        {/* Feature list */}
        <div
          className={cn(
            "pb-8",
            isCompact ? "max-h-56 space-y-2 overflow-y-auto pb-5 pr-1" : "space-y-3"
          )}
        >
          {features.map((feature) => {
            const value = isPro ? feature.pro : feature.free
            return (
              <div
                key={feature.label}
                className={cn(
                  "flex items-center justify-between",
                  isCompact ? "text-xs" : "text-sm"
                )}
              >
                <span className="text-muted-foreground">{feature.label}</span>
                {typeof value === "boolean" ? (
                  value ? (
                    <Check
                      className={cn(
                        "text-pricing-success",
                        isCompact ? "size-3.5" : "size-4"
                      )}
                    />
                  ) : (
                    <Minus
                      className={cn(
                        "text-muted-foreground/30",
                        isCompact ? "size-3.5" : "size-4"
                      )}
                    />
                  )
                ) : (
                  <span
                    className={cn(
                      "font-medium text-foreground/90",
                      isCompact && "text-right"
                    )}
                  >
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
