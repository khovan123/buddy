"use client"

import { useState } from "react"

import { useRouter } from "next/navigation"

import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { v4 as uuid } from "uuid"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { extractApiError } from "@/types/api"

import { useWithdrawWalletMutation } from "../services/billing-api"
import { formatVND } from "../types/billing-types"

interface WithdrawDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBalance: string
}

export function WithdrawDialog({
  open,
  onOpenChange,
  currentBalance,
}: WithdrawDialogProps) {
  const router = useRouter()
  const [amount, setAmount] = useState("")
  const [withdraw, { isLoading }] = useWithdrawWalletMutation()

  const balanceNum = Number(currentBalance)
  const amountNum = Number(amount)
  const isValid = amountNum > 0 && amountNum <= balanceNum

  const handleSubmit = async () => {
    if (!isValid) {
      return
    }

    try {
      await withdraw({
        amountInCents: amount,
        idempotencyKey: uuid(),
      }).unwrap()

      toast.success("Withdrawal request created!")
      setAmount("")
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setAmount("")
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw</DialogTitle>
          <DialogDescription>
            Transfer funds from your wallet to your payout account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl bg-muted/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Available Balance
            </p>
            <p className="text-lg font-bold tabular-nums">
              {formatVND(currentBalance)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="withdraw-amount">
              Withdrawal Amount (VND)
            </Label>
            <Input
              id="withdraw-amount"
              type="number"
              min="1"
              max={balanceNum}
              placeholder="e.g. 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            {amount && amountNum > balanceNum && (
              <p className="text-xs text-destructive">
                Amount exceeds your available balance.
              </p>
            )}

            {amount && amountNum > 0 && amountNum <= balanceNum && (
              <p className="text-xs text-muted-foreground">
                You will withdraw {formatVND(amount)}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            id="withdraw-submit-btn"
            onClick={handleSubmit}
            disabled={isLoading || !isValid}
          >
            {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Withdraw
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
