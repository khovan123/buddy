"use client"

import { Crown, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlanSelectorDialog } from "@/features/user/components/plan-selector-dialog"

import type { Subscription, SubscriptionStatus } from "../types/billing-types"
import { PLAN_DISPLAY_NAMES, PLAN_LIMITS } from "../types/billing-types"

interface SubscriptionCardProps {
  subscription: Subscription | null
}

const STATUS_STYLES: Record<
  SubscriptionStatus,
  { variant: "default" | "secondary" | "destructive"; label: string }
> = {
  ACTIVE: { variant: "default", label: "Active" },
  CANCELLED: { variant: "secondary", label: "Cancelled" },
  EXPIRED: { variant: "destructive", label: "Expired" },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatStorage(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${Math.round(bytes / (1024 * 1024 * 1024))} GB`
  }
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

function formatLimit(value: number): string {
  return value === -1 ? "Unlimited" : String(value)
}

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const isPro = subscription?.plan?.includes("PRO") ?? false
  const statusConfig = subscription ? STATUS_STYLES[subscription.status] : null
  const limits = subscription ? PLAN_LIMITS[subscription.plan] : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
          Subscription
        </CardTitle>
        <PlanSelectorDialog
          triggerText={subscription ? "Change plan" : "Choose plan"}
          triggerVariant={subscription && !isPro ? "default" : "outline"}
          triggerClassName="inline-flex font-semibold"
        />
      </CardHeader>

      <CardContent>
        {subscription ? (
          <div className="space-y-4">
            {/* Plan name & status */}
            <div className="flex items-center gap-3">
              <div
                className={`flex size-10 items-center justify-center rounded-xl ${
                  isPro
                    ? "bg-linear-to-br from-amber-400 to-orange-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isPro ? (
                  <Crown className="size-5" />
                ) : (
                  <Sparkles className="size-5" />
                )}
              </div>

              <div>
                <p className="text-base font-semibold">
                  {PLAN_DISPLAY_NAMES[subscription.plan]}
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={statusConfig!.variant}
                    className="text-[10px] uppercase"
                  >
                    {statusConfig!.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Since {formatDate(subscription.startsAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Limits */}
            {limits && (
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Storage</p>
                  <p className="font-semibold">
                    {formatStorage(limits.storageBytes)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Resources</p>
                  <p className="font-semibold">
                    {formatLimit(limits.maxResources)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tutorials</p>
                  <p className="font-semibold">
                    {formatLimit(limits.maxTutorials)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Collections</p>
                  <p className="font-semibold">
                    {formatLimit(limits.maxCollections)}
                  </p>
                </div>
              </div>
            )}

            {/* Expiry */}
            {subscription.expiresAt && (
              <p className="text-xs text-muted-foreground">
                Expires on {formatDate(subscription.expiresAt)}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Sparkles className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No active subscription
            </p>
            <PlanSelectorDialog
              triggerText="Choose plan"
              triggerVariant="default"
              triggerClassName="inline-flex font-semibold"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
