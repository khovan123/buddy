"use client"
import { useCallback, useState, useTransition } from "react"

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleDollarSign,
  Clock,
  Filter,
  Loader2,
  RefreshCcw,
  ShoppingCart,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/i18n/language-provider"

import { fetchTransactionsAction } from "../actions/billing.actions"
import type {
  Transaction,
  TransactionPage,
  TransactionStatus,
  TransactionType,
} from "../types/billing-types"
import { formatVND } from "../types/billing-types"

// ── Config ─────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  TransactionStatus,
  "default" | "secondary" | "destructive"
> = {
  PENDING: "secondary",
  SUCCESS: "default",
  FAILED: "destructive",
}

// ── Helpers ────────────────────────────────────────────────
function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ── Sub-components ─────────────────────────────────────────

function TransactionRow({
  tx,
  locale,
  labels,
}: {
  tx: Transaction
  locale: string
  labels: Record<TransactionType, { icon: typeof Clock; label: string; sign: "+" | "-"; color: string }>
}) {
  const config = labels[tx.type]
  const Icon = config.icon

  return (
    <div className="group flex items-center gap-4 rounded-xl px-4 py-3.5 transition-colors hover:bg-muted/50">
      {/* Icon */}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-primary/10">
        <Icon className="size-4 text-muted-foreground" />
      </div>

      {/* Label + date */}
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-medium leading-none">{config.label}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(tx.createdAt, locale)}
        </p>
      </div>

      {/* Amount + status */}
      <div className="flex flex-col items-end gap-1">
        <span className={`text-sm font-semibold tabular-nums ${config.color}`}>
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
  )
}

function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────

interface TransactionHistoryPageProps {
  initialData: TransactionPage | null
}

export default function TransactionHistoryPage({
  initialData,
}: TransactionHistoryPageProps) {
  const { locale, t } = useI18n()
  const [transactions, setTransactions] = useState<Transaction[]>(
    initialData?.data ?? []
  )
  const [meta, setMeta] = useState(initialData?.meta ?? null)
  const [isPending, startTransition] = useTransition()

  const [typeFilter, setTypeFilter] = useState<TransactionType | "ALL">("ALL")
  const [statusFilter, setStatusFilter] = useState<
    TransactionStatus | "ALL"
  >("ALL")
  const dateLocale = locale === "en" ? "en-US" : "vi-VN"
  const typeConfig: Record<
    TransactionType,
    { icon: typeof Clock; label: string; sign: "+" | "-"; color: string }
  > = {
    TOP_UP: {
      icon: ArrowDownToLine,
      label: t("billing.transactions.topUp"),
      sign: "+",
      color: "text-emerald-600 dark:text-emerald-400",
    },
    PURCHASE_DEBIT: {
      icon: ShoppingCart,
      label: t("billing.transactions.purchase"),
      sign: "-",
      color: "text-foreground",
    },
    PURCHASE_CREDIT: {
      icon: CircleDollarSign,
      label: t("billing.transactions.saleCredit"),
      sign: "+",
      color: "text-emerald-600 dark:text-emerald-400",
    },
    WITHDRAW: {
      icon: ArrowUpFromLine,
      label: t("billing.transactions.withdraw"),
      sign: "-",
      color: "text-foreground",
    },
    REFUND_DEBIT: {
      icon: RefreshCcw,
      label: t("billing.transactions.refundSent"),
      sign: "-",
      color: "text-foreground",
    },
    REFUND_CREDIT: {
      icon: RefreshCcw,
      label: t("billing.transactions.refundReceived"),
      sign: "+",
      color: "text-emerald-600 dark:text-emerald-400",
    },
  }
  const typeFilters: { value: TransactionType | "ALL"; label: string }[] = [
    { value: "ALL", label: t("billing.transactions.all") },
    { value: "TOP_UP", label: t("billing.transactions.topUp") },
    { value: "PURCHASE_DEBIT", label: t("billing.transactions.purchase") },
    { value: "PURCHASE_CREDIT", label: t("billing.transactions.saleCredit") },
    { value: "WITHDRAW", label: t("billing.transactions.withdraw") },
    { value: "REFUND_DEBIT", label: t("billing.transactions.refundSent") },
    { value: "REFUND_CREDIT", label: t("billing.transactions.refundReceived") },
  ]
  const statusFilters: { value: TransactionStatus | "ALL"; label: string }[] = [
    { value: "ALL", label: t("billing.transactions.all") },
    { value: "SUCCESS", label: t("billing.transactions.success") },
    { value: "PENDING", label: t("billing.transactions.pending") },
    { value: "FAILED", label: t("billing.transactions.failed") },
  ]

  const hasMore = meta ? meta.page < meta.totalPages : false

  const loadMore = useCallback(() => {
    if (!meta || !hasMore) {return}

    startTransition(async () => {
      try {
        const nextPage = meta.page + 1
        const page = await fetchTransactionsAction(nextPage, meta.limit)
        
        if (!page) {return}

        setTransactions((prev) => [...prev, ...page.data])
        setMeta(page.meta)
      } catch {
        // silently fail — user can retry
      }
    })
  }, [meta, hasMore])

  // Client-side filtering (applied on already-loaded data)
  const filtered = transactions.filter((tx) => {
    if (typeFilter !== "ALL" && tx.type !== typeFilter) {return false}
    if (statusFilter !== "ALL" && tx.status !== statusFilter) {return false}
    return true
  })

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t("common.filter")}
          </CardTitle>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {t("common.type")}
            </p>
            <FilterChips
              options={typeFilters}
              value={typeFilter}
              onChange={setTypeFilter}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {t("common.status")}
            </p>
            <FilterChips
              options={statusFilters}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Clock className="size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {t("billing.transactions.empty")}
            </p>
            <p className="text-xs text-muted-foreground/60">
              {transactions.length > 0
                ? t("common.tryAdjustingFilters")
                : t("billing.transactions.emptyHint")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} locale={dateLocale} labels={typeConfig} />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center pt-6">
            <Button
              id="transactions-load-more-btn"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={loadMore}
              className="gap-2"
            >
              {isPending && <Loader2 className="size-3 animate-spin" />}
              {t("common.loadMore")}
            </Button>
          </div>
        )}

        {/* Summary footer */}
        {meta && (
          <p className="pt-4 text-center text-xs text-muted-foreground/50">
            {t("common.showingOf", {
              shown: String(transactions.length),
              total: String(meta.total),
              item: t("settings.transactions").toLowerCase(),
            })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
