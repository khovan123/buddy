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
import { extractApiError } from "@/types/api"

interface PurchaseButtonProps {
  itemId: string
  itemType: PurchasableContentType
  label?: string
  className?: string
  price?: number
}

export function PurchaseButton({
  itemId,
  itemType,
  label = "Buy Now",
  className,
  price,
}: PurchaseButtonProps) {
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
  }, [getQuote, itemId, itemType, refetchBalance])

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
      toast.success("Purchase completed. Your library is being updated.")
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
        {price && price > 0 ? label : "Learn now"}
      </Button>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm checkout</DialogTitle>
            <DialogDescription>
              The purchase is paid from your Buddy wallet and added to your
              library after confirmation.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-muted/50 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">
              Total
            </p>
            <p className="mt-1 text-2xl font-bold">
              {formatVND(quoteAmount ?? "0")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handlePurchase()}
              disabled={isPurchasing}
            >
              {isPurchasing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Pay with wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={insufficientOpen} onOpenChange={setInsufficientOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Top up your wallet</DialogTitle>
            <DialogDescription>
              Your wallet balance is insufficient for this checkout. Add funds
              to continue the purchase.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
            <Wallet className="size-5 text-primary" />
            <span className="text-sm font-medium">
              Required: {formatVND(quoteAmount ?? "0")}
            </span>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInsufficientOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setInsufficientOpen(false)
                setTopUpOpen(true)
              }}
            >
              Top up wallet
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
