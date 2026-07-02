"use client"

import { Crown, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlanSelectorDialog } from "@/features/user/components/plan-selector-dialog"
import { useI18n } from "@/i18n/language-provider"

import type {
  Subscription,
  SubscriptionPlanCatalogItem,
  SubscriptionStatus,
} from "../types/billing-types"
import { PLAN_DISPLAY_NAME_KEYS } from "../types/billing-types"

interface SubscriptionCardProps {
  subscription: Subscription | null
  planCatalog: SubscriptionPlanCatalogItem[]
}

const STATUS_STYLES: Record<
  SubscriptionStatus,
  { variant: "default" | "secondary" | "destructive" }
> = {
  ACTIVE: { variant: "default" },
  CANCELLED: { variant: "secondary" },
  EXPIRED: { variant: "destructive" },
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

export function SubscriptionCard({
  subscription,
  planCatalog,
}: SubscriptionCardProps) {
  const { t } = useI18n()
  const isPro = subscription?.plan?.includes("PRO") ?? false
  const statusLabels: Record<SubscriptionStatus, string> = {
    ACTIVE: t("billing.subscription.statusActive"),
    CANCELLED: t("billing.subscription.statusCancelled"),
    EXPIRED: t("billing.subscription.statusExpired"),
  }
  const statusConfig = subscription
    ? {
        ...STATUS_STYLES[subscription.status],
        label: statusLabels[subscription.status],
      }
    : null
  const formatLimit = (value: number) =>
    value === -1 ? t("dashboard.planLimits.unlimited") : String(value)
  const limits = subscription
    ? planCatalog.find((plan) => plan.code === subscription.plan)?.limits
    : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
          {t("billing.subscription.cardTitle")}
        </CardTitle>
        <PlanSelectorDialog
          triggerText={
            subscription
              ? t("billing.subscription.changePlan")
              : t("billing.subscription.choosePlan")
          }
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
                  {t(PLAN_DISPLAY_NAME_KEYS[subscription.plan] as never)}
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={statusConfig!.variant}
                    className="text-[10px] uppercase"
                  >
                    {statusConfig!.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {t("billing.subscription.since", {
                      date: formatDate(subscription.startsAt),
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Limits */}
            {limits && (
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-3 text-xs">
                <div>
                  <p className="text-muted-foreground">
                    {t("billing.subscription.storage")}
                  </p>
                  <p className="font-semibold">
                    {formatStorage(limits.storageBytes)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {t("billing.subscription.resources")}
                  </p>
                  <p className="font-semibold">
                    {formatLimit(limits.maxResources)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {t("billing.subscription.tutorials")}
                  </p>
                  <p className="font-semibold">
                    {formatLimit(limits.maxTutorials)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {t("billing.subscription.collections")}
                  </p>
                  <p className="font-semibold">
                    {formatLimit(limits.maxCollections)}
                  </p>
                </div>
              </div>
            )}

            {/* Expiry */}
            {subscription.expiresAt && (
              <p className="text-xs text-muted-foreground">
                {t("billing.subscription.expiresOn", {
                  date: formatDate(subscription.expiresAt),
                })}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Sparkles className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {t("billing.subscription.noActive")}
            </p>
            <PlanSelectorDialog
              triggerText={t("billing.subscription.choosePlan")}
              triggerVariant="default"
              triggerClassName="inline-flex font-semibold"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
