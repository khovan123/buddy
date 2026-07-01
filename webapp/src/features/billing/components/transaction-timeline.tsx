"use client"

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleDollarSign,
  Clock,
  RefreshCcw,
  ShoppingCart,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/i18n/language-provider"

import type {
  Transaction,
  TransactionPage,
  TransactionStatus,
  TransactionType,
} from "../types/billing-types"
import { formatVND } from "../types/billing-types"

interface TransactionTimelineProps {
  initialData: TransactionPage | null
}

const STATUS_VARIANT: Record<
  TransactionStatus,
  "default" | "secondary" | "destructive"
> = {
  PENDING: "secondary",
  SUCCESS: "default",
  FAILED: "destructive",
}

function formatRelativeDate(
  dateStr: string,
  locale: string,
  labels: {
    justNow: string
    minutesAgo: (count: string) => string
    hoursAgo: (count: string) => string
    daysAgo: (count: string) => string
  }
): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)

  if (diffMins < 1) {
    return labels.justNow
  }
  if (diffMins < 60) {
    return labels.minutesAgo(String(diffMins))
  }

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) {
    return labels.hoursAgo(String(diffHours))
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) {
    return labels.daysAgo(String(diffDays))
  }

  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  })
}

function TransactionEntry({
  tx,
  locale,
  relativeLabels,
  labels,
}: {
  tx: Transaction
  locale: string
  relativeLabels: {
    justNow: string
    minutesAgo: (count: string) => string
    hoursAgo: (count: string) => string
    daysAgo: (count: string) => string
  }
  labels: Record<TransactionType, { icon: typeof Clock; label: string; sign: "+" | "-" }>
}) {
  const config = labels[tx.type]
  const Icon = config.icon
  const isPositive = config.sign === "+"

  return (
    <div className="group relative flex items-start gap-4 py-3">
      {/* Timeline dot & line */}
      <div className="relative flex flex-col items-center">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-primary/10">
          <Icon className="size-4 text-muted-foreground" />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-sm font-medium leading-none">{config.label}</p>
          <p className="text-xs text-muted-foreground">
            {formatRelativeDate(tx.createdAt, locale, relativeLabels)}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-sm font-semibold tabular-nums ${
              isPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-foreground"
            }`}
          >
            {config.sign}
            {formatVND(tx.amountInCents)}
          </span>
          <Badge
            variant={STATUS_VARIANT[tx.status]}
            className="text-[10px] uppercase tracking-wider"
          >
            {tx.status}
          </Badge>
        </div>
      </div>
    </div>
  )
}

export function TransactionTimeline({
  initialData,
}: TransactionTimelineProps) {
  const { locale, t } = useI18n()
  const transactions = initialData?.data ?? []
  const dateLocale = locale === "en" ? "en-US" : "vi-VN"
  const relativeLabels = {
    justNow: t("billing.transactions.justNow"),
    minutesAgo: (count: string) =>
      t("billing.transactions.minutesAgo", { count }),
    hoursAgo: (count: string) => t("billing.transactions.hoursAgo", { count }),
    daysAgo: (count: string) => t("billing.transactions.daysAgo", { count }),
  }
  const typeConfig: Record<
    TransactionType,
    { icon: typeof Clock; label: string; sign: "+" | "-" }
  > = {
    TOP_UP: { icon: ArrowDownToLine, label: t("billing.transactions.topUp"), sign: "+" },
    PURCHASE_DEBIT: { icon: ShoppingCart, label: t("billing.transactions.purchase"), sign: "-" },
    PURCHASE_CREDIT: {
      icon: CircleDollarSign,
      label: t("billing.transactions.saleCredit"),
      sign: "+",
    },
    WITHDRAW: { icon: ArrowUpFromLine, label: t("billing.transactions.withdraw"), sign: "-" },
    REFUND_DEBIT: { icon: RefreshCcw, label: t("billing.transactions.refundSent"), sign: "-" },
    REFUND_CREDIT: { icon: RefreshCcw, label: t("billing.transactions.refundReceived"), sign: "+" },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {t("billing.transactions.recentTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Clock className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {t("billing.transactions.empty")}
            </p>
            <p className="text-xs text-muted-foreground/60">
              {t("billing.transactions.emptyHint")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {transactions.map((tx) => (
              <TransactionEntry
                key={tx.id}
                tx={tx}
                locale={dateLocale}
                relativeLabels={relativeLabels}
                labels={typeConfig}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
