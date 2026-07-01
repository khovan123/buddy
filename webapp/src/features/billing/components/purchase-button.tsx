"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { useRouter } from "next/navigation"

import { Loader2, Wallet } from "lucide-react"
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
import { TopUpDialog } from "@/features/billing/components/top-up-dialog"
import {
  type PurchasableContentType,
  useGetPurchaseQuoteMutation,
  useGetWalletBalanceQuery,
  usePurchaseMutation,
} from "@/features/billing/services/billing-api"
import { formatVND } from "@/features/billing/types/billing-types"
import { useI18n } from "@/i18n/language-provider"
import { extractApiError } from "@/types/api"

interface PurchaseButtonProps {
  itemId: string
  itemType: PurchasableContentType
  label?: string
  freeLabel?: string
  className?: string
  price?: number
  trackingEventName?: string
  trackingPayload?: Record<string, boolean | number | string | null | undefined>
}

export function PurchaseButton({
  itemId,
  itemType,
  label,
  freeLabel,
  className,
  price,
  trackingEventName,
  trackingPayload,
}: PurchaseButtonProps) {
  const { t } = useI18n()
  const router = useRouter()
  const hasResumed = useRef(false)
  const [quoteAmount, setQuoteAmount] = useState<string | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [insufficientOpen, setInsufficientOpen] = useState(false)
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [getQuote, { isLoading: isQuoting }] = useGetPurchaseQuoteMutation()
  const [purchase, { isLoading: isPurchasing }] = usePurchaseMutation()
  const { refetch: refetchBalance } = useGetWalletBalanceQuery()

  const prepareCheckout = useCallback(async () => {
    try {
      if (trackingEventName && typeof globalThis.window !== "undefined") {
        globalThis.window.dispatchEvent(
          new CustomEvent("buddy:analytics", {
            detail: {
              event: trackingEventName,
              payload: {
                itemId,
                itemType,
                ...trackingPayload,
              },
            },
          })
        )
      }

      const [quoteResponse, balanceResponse] = await Promise.all([
        getQuote({ itemId, itemType }).unwrap(),
        refetchBalance().unwrap(),
      ])
      const payableAmount = quoteResponse.data.payableAmountInCents

      setQuoteAmount(payableAmount)
      if (BigInt(balanceResponse.data.balanceInCents) < BigInt(payableAmount)) {
        setInsufficientOpen(true)
        return
      }

      setCheckoutOpen(true)
    } catch (error) {
      toast.error(extractApiError(error))
    }
  }, [
    getQuote,
    itemId,
    itemType,
    refetchBalance,
    trackingEventName,
    trackingPayload,
  ])

  useEffect(() => {
    const searchParams = new URLSearchParams(globalThis.location.search)

    if (
      searchParams.get("checkout") !== "resume" ||
      searchParams.get("itemId") !== itemId ||
      searchParams.get("itemType") !== itemType ||
      hasResumed.current
    ) {
      return
    }

    hasResumed.current = true
    void prepareCheckout()
  }, [itemId, itemType, prepareCheckout])

  const handlePurchase = async () => {
    try {
      await purchase({
        itemId,
        itemType,
        idempotencyKey: crypto.randomUUID(),
      }).unwrap()
      toast.success(t("billing.purchase.success"))
      setCheckoutOpen(false)
      router.push("/library")
      router.refresh()
    } catch (error) {
      const message = extractApiError(error)
      if (message.toLowerCase().includes("insufficient wallet balance")) {
        setCheckoutOpen(false)
        setInsufficientOpen(true)
        return
      }
      toast.error(message)
    }
  }

  const topUpReturnUrl =
    typeof globalThis.window === "undefined"
      ? undefined
      : `${globalThis.location.origin}${globalThis.location.pathname}?checkout=resume&itemType=${encodeURIComponent(itemType)}&itemId=${encodeURIComponent(itemId)}`
  return (
    <>
      <Button
        className={className}
        size="lg"
        onClick={() => void prepareCheckout()}
        disabled={isQuoting}
      >
        {isQuoting ? <Loader2 className="size-4 animate-spin" /> : null}
        {price && price > 0
          ? label || t("billing.purchase.buyNow")
          : freeLabel || t("billing.purchase.learnNow")}
      </Button>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("billing.purchase.confirmTitle")}</DialogTitle>
            <DialogDescription>{t("billing.purchase.confirmDescription")}</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-muted/50 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              {t("billing.purchase.total")}
            </p>
            <p className="mt-1 text-2xl font-bold">
              {formatVND(quoteAmount ?? "0")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCheckoutOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => void handlePurchase()}
              disabled={isPurchasing}
            >
              {isPurchasing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {t("billing.purchase.payWithWallet")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={insufficientOpen} onOpenChange={setInsufficientOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("billing.purchase.topUpTitle")}</DialogTitle>
            <DialogDescription>{t("billing.purchase.topUpDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
            <Wallet className="size-5 text-primary" />
            <span className="text-sm font-medium">
              {t("billing.purchase.required")}: {formatVND(quoteAmount ?? "0")}
            </span>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInsufficientOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                setInsufficientOpen(false)
                setTopUpOpen(true)
              }}
            >
              {t("billing.purchase.topUpWallet")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TopUpDialog
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        returnUrl={topUpReturnUrl}
      />
    </>
  )
}
