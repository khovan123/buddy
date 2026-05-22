"use client"

import { useState } from "react"

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { useGetWalletBalanceQuery } from "../services/billing-api"
import type { WalletBalance } from "../types/billing-types"
import { formatVND } from "../types/billing-types"

import { TopUpDialog } from "./top-up-dialog"
import { WithdrawDialog } from "./withdraw-dialog"


interface WalletHeroCardProps {
  balance: WalletBalance | null
}

export function WalletHeroCard({ balance }: WalletHeroCardProps) {
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const { data, isFetching } = useGetWalletBalanceQuery()
  const currentBalance = data?.data ?? balance

  return (
    <>
      <Card className="relative overflow-hidden border-0 bg-linear-to-br from-pricing-gradient-from to-pricing-gradient-to text-white shadow-xl">
        {/* Decorative mesh */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
          <div className="absolute -top-24 -right-24 size-64 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-16 -left-16 size-48 rounded-full bg-white blur-3xl" />
        </div>

        <CardContent className="relative z-10 flex flex-col gap-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white/70">
              <Wallet className="size-4" />
              <span className="text-xs font-medium uppercase tracking-widest">
                Wallet Balance
              </span>
            </div>

            {currentBalance ? (
              <p className="text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
                {formatVND(currentBalance.balanceInCents)}
              </p>
            ) : (
              <Skeleton className="h-12 w-48 bg-white/20" />
            )}

            <p className="text-xs text-white/50">
              {currentBalance?.currency ?? "VND"} - {isFetching ? "Refreshing" : "Updated just now"}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              id="settings-topup-btn"
              variant="secondary"
              className="gap-2 bg-white/15 text-white backdrop-blur-sm hover:bg-white/25"
              onClick={() => setTopUpOpen(true)}
            >
              <ArrowDownToLine className="size-4" />
              Deposit
            </Button>
            <Button
              id="settings-withdraw-btn"
              variant="secondary"
              className="gap-2 bg-white/15 text-white backdrop-blur-sm hover:bg-white/25"
              onClick={() => setWithdrawOpen(true)}
            >
              <ArrowUpFromLine className="size-4" />
              Withdraw
            </Button>
          </div>
        </CardContent>
      </Card>

      <TopUpDialog open={topUpOpen} onOpenChange={setTopUpOpen} />
      <WithdrawDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        currentBalance={currentBalance?.balanceInCents ?? "0"}
      />
    </>
  )
}
