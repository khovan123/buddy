"use client"

import { useState } from "react"

import { ArrowDownToLine, ArrowUpFromLine, Loader2, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { TopUpDialog } from "@/features/billing/components/top-up-dialog"
import { WithdrawDialog } from "@/features/billing/components/withdraw-dialog"
import { useGetWalletBalanceQuery } from "@/features/billing/services/billing-api"
import { formatVND } from "@/features/billing/types/billing-types"

export function HeaderWalletPopover() {
  const [open, setOpen] = useState(false)
  const [depositOpen, setDepositOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const { data, isFetching } = useGetWalletBalanceQuery()
  const balance = data?.data

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Wallet balance"
            className="hidden gap-2 font-semibold md:inline-flex"
          >
            <Wallet className="size-4" />
            {balance ? (
              <span className="tabular-nums">
                {formatVND(balance.balanceInCents)}
              </span>
            ) : isFetching ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <span>Wallet</span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-72 gap-4">
          <PopoverHeader>
            <PopoverTitle className="text-sm font-semibold">
              Wallet balance
            </PopoverTitle>
            <PopoverDescription className="text-xs">
              Deposit funds or withdraw to your verified payout account.
            </PopoverDescription>
          </PopoverHeader>

          <div className="rounded-2xl bg-secondary/70 px-4 py-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Available
            </p>
            {balance ? (
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {formatVND(balance.balanceInCents)}
              </p>
            ) : (
              <Skeleton className="mt-2 h-8 w-36" />
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {balance?.currency ?? "VND"} - {isFetching ? "Refreshing" : "Ready"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setOpen(false)
                setDepositOpen(true)
              }}
            >
              <ArrowDownToLine className="size-3.5" />
              Deposit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setOpen(false)
                setWithdrawOpen(true)
              }}
              disabled={!balance || Number(balance.balanceInCents) <= 0}
            >
              <ArrowUpFromLine className="size-3.5" />
              Withdraw
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <TopUpDialog open={depositOpen} onOpenChange={setDepositOpen} />
      <WithdrawDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        currentBalance={balance?.balanceInCents ?? "0"}
      />
    </>
  )
}
