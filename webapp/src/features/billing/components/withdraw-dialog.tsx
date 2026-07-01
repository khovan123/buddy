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
import { useI18n } from "@/i18n/language-provider"
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
  const { t } = useI18n()
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

      toast.success(t("billing.withdraw.success"))
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
          <DialogTitle>{t("billing.withdraw.title")}</DialogTitle>
          <DialogDescription>{t("billing.withdraw.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl bg-muted/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {t("billing.withdraw.availableBalance")}
            </p>
            <p className="text-lg font-bold tabular-nums">
              {formatVND(currentBalance)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="withdraw-amount">
              {t("billing.withdraw.amount")}
            </Label>
            <Input
              id="withdraw-amount"
              type="number"
              min="1"
              max={balanceNum}
              placeholder={t("billing.withdraw.placeholder")}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            {amount && amountNum > balanceNum && (
              <p className="text-xs text-destructive">
                {t("billing.withdraw.exceeds")}
              </p>
            )}

            {amount && amountNum > 0 && amountNum <= balanceNum && (
              <p className="text-xs text-muted-foreground">
                {t("billing.withdraw.withdrawing", { amount: formatVND(amount) })}
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
            {t("common.cancel")}
          </Button>
          <Button
            id="withdraw-submit-btn"
            onClick={handleSubmit}
            disabled={isLoading || !isValid}
          >
            {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("billing.withdraw.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
