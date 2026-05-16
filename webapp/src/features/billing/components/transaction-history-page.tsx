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

import { fetchTransactionsAction } from "../actions/billing.actions"
import type {
  Transaction,
  TransactionPage,
  TransactionStatus,
  TransactionType,
} from "../types/billing-types"
import { formatVND } from "../types/billing-types"

// ── Config ─────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  TransactionType,
  { icon: typeof Clock; label: string; sign: "+" | "-"; color: string }
> = {
  TOP_UP: {
    icon: ArrowDownToLine,
    label: "Top Up",
    sign: "+",
    color: "text-emerald-600 dark:text-emerald-400",
  },
  PURCHASE_DEBIT: {
    icon: ShoppingCart,
    label: "Purchase",
    sign: "-",
    color: "text-foreground",
  },
  PURCHASE_CREDIT: {
    icon: CircleDollarSign,
    label: "Sale Credit",
    sign: "+",
    color: "text-emerald-600 dark:text-emerald-400",
  },
  WITHDRAW: {
    icon: ArrowUpFromLine,
    label: "Withdraw",
    sign: "-",
    color: "text-foreground",
  },
  REFUND_DEBIT: {
    icon: RefreshCcw,
    label: "Refund Sent",
    sign: "-",
    color: "text-foreground",
  },
  REFUND_CREDIT: {
    icon: RefreshCcw,
    label: "Refund Received",
    sign: "+",
    color: "text-emerald-600 dark:text-emerald-400",
  },
}

const STATUS_VARIANT: Record<
  TransactionStatus,
  "default" | "secondary" | "destructive"
> = {
  PENDING: "secondary",
  SUCCESS: "default",
  FAILED: "destructive",
}

const TYPE_FILTERS: { value: TransactionType | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "TOP_UP", label: "Top Up" },
  { value: "PURCHASE_DEBIT", label: "Purchase" },
  { value: "PURCHASE_CREDIT", label: "Sale Credit" },
  { value: "WITHDRAW", label: "Withdraw" },
  { value: "REFUND_DEBIT", label: "Refund Sent" },
  { value: "REFUND_CREDIT", label: "Refund Received" },
]

const STATUS_FILTERS: { value: TransactionStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "SUCCESS", label: "Success" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
]

// ── Helpers ────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ── Sub-components ─────────────────────────────────────────

function TransactionRow({ tx }: { tx: Transaction }) {
  const config = TYPE_CONFIG[tx.type]
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
          {formatDate(tx.createdAt)}
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
  const [transactions, setTransactions] = useState<Transaction[]>(
    initialData?.data ?? []
  )
  const [meta, setMeta] = useState(initialData?.meta ?? null)
  const [isPending, startTransition] = useTransition()

  const [typeFilter, setTypeFilter] = useState<TransactionType | "ALL">("ALL")
  const [statusFilter, setStatusFilter] = useState<
    TransactionStatus | "ALL"
  >("ALL")

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
            Filter
          </CardTitle>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Type
            </p>
            <FilterChips
              options={TYPE_FILTERS}
              value={typeFilter}
              onChange={setTypeFilter}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Status
            </p>
            <FilterChips
              options={STATUS_FILTERS}
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
              No transactions found
            </p>
            <p className="text-xs text-muted-foreground/60">
              {transactions.length > 0
                ? "Try adjusting your filters."
                : "Top up your wallet to get started."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
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
              Load More
            </Button>
          </div>
        )}

        {/* Summary footer */}
        {meta && (
          <p className="pt-4 text-center text-xs text-muted-foreground/50">
            Showing {transactions.length} of {meta.total} transactions
          </p>
        )}
      </CardContent>
    </Card>
  )
}
