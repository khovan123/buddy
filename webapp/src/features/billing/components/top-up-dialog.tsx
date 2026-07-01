"use client"

import { useState } from "react"

import { Loader2 } from "lucide-react"
import { toast } from "sonner"

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

import { useTopUpWalletMutation } from "../services/billing-api"
import { formatVND } from "../types/billing-types"

interface TopUpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  returnUrl?: string
}

const PRESET_AMOUNTS = [
  { label: "₫50,000", value: "50000" },
  { label: "₫100,000", value: "100000" },
  { label: "₫200,000", value: "200000" },
  { label: "₫500,000", value: "500000" },
]

function submitCheckout(checkoutUrl: string) {
  const url = new URL(checkoutUrl)

  if (!url.search) {
    globalThis.location.href = checkoutUrl
    return
  }

  const form = document.createElement("form")
  form.method = "POST"
  form.action = `${url.origin}${url.pathname}`
  form.style.display = "none"

  url.searchParams.forEach((value, key) => {
    const input = document.createElement("input")
    input.type = "hidden"
    input.name = key
    input.value = value
    form.appendChild(input)
  })

  document.body.appendChild(form)
  form.submit()
}

export function TopUpDialog({
  open,
  onOpenChange,
  returnUrl,
}: TopUpDialogProps) {
  const { t } = useI18n()
  const [amount, setAmount] = useState("")
  const [topUp, { isLoading }] = useTopUpWalletMutation()

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error(t("billing.topup.invalid"))
      return
    }

    try {
      const origin =
        typeof globalThis.window !== "undefined"
          ? globalThis.location.origin
          : ""
      const res = await topUp({
        amountInCents: amount,
        provider: "SEPAY",
        returnUrl: returnUrl ?? `${origin}/settings/billing?topup=success`,
        cancelUrl: `${origin}/settings/billing?topup=cancelled`,
      }).unwrap()

      if (res.data?.checkoutUrl) {
        submitCheckout(res.data.checkoutUrl)
      }
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
          <DialogTitle>{t("billing.topup.title")}</DialogTitle>
          <DialogDescription>{t("billing.topup.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Preset amounts */}
          <div className="grid grid-cols-2 gap-2">
            {PRESET_AMOUNTS.map((preset) => (
              <Button
                key={preset.value}
                id={`topup-preset-${preset.value}`}
                type="button"
                variant={amount === preset.value ? "default" : "outline"}
                size="sm"
                onClick={() => setAmount(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="space-y-2">
            <Label htmlFor="topup-custom-amount">{t("billing.topup.customAmount")}</Label>
            <Input
              id="topup-custom-amount"
              type="number"
              min="1000"
              placeholder={t("billing.topup.placeholder")}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {amount && Number(amount) > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("billing.topup.depositing", { amount: formatVND(amount) })}
              </p>
            )}
          </div>

          <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm">
            <p className="font-medium">{t("billing.topup.checkout")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("billing.topup.checkoutDescription")}
            </p>
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
            id="topup-submit-btn"
            onClick={handleSubmit}
            disabled={isLoading || !amount || Number(amount) <= 0}
          >
            {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("billing.topup.continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
