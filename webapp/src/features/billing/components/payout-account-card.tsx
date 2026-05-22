"use client"

import { useEffect, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  BadgeCheck,
  Building2,
  Loader2,
  Pencil,
  Save,
  ShieldAlert,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useGlobalError } from "@/providers/error-provider"

import {
  useSavePayoutAccountMutation,
  useVerifyBankAccountMutation,
} from "../services/billing-api"
import type { PayoutAccount } from "../types/billing-types"

const payoutSchema = z.object({
  bankBin: z.string().min(3, "Bank BIN is required"),
  bankAccountNumber: z.string().min(5, "Account number is required"),
  bankAccountName: z.string().min(2, "Account name is required"),
  bankName: z.string().min(2, "Bank name is required"),
})

type PayoutFormValues = z.infer<typeof payoutSchema>

interface PayoutAccountCardProps {
  account: PayoutAccount | null
}

function maskAccountNumber(num: string): string {
  if (num.length <= 4) {
    return num
  }
  return "•".repeat(num.length - 4) + num.slice(-4)
}

export function PayoutAccountCard({ account }: PayoutAccountCardProps) {
  const [currentAccount, setCurrentAccount] = useState(account)
  const [editing, setEditing] = useState(false)
  const [verified, setVerified] = useState(Boolean(account?.verified))
  const { handleError, clearError } = useGlobalError()

  const [savePayoutAccount, { isLoading: isSaving }] =
    useSavePayoutAccountMutation()
  const [verifyBankAccount, { isLoading: isVerifying }] =
    useVerifyBankAccountMutation()

  useEffect(() => {
    setCurrentAccount(account)
    setVerified(Boolean(account?.verified))
  }, [account])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PayoutFormValues>({
    resolver: zodResolver(payoutSchema),
    values: currentAccount
      ? {
          bankBin: currentAccount.bankBin,
          bankAccountNumber: currentAccount.bankAccountNumber,
          bankAccountName: currentAccount.bankAccountName,
          bankName: currentAccount.bankName,
        }
      : {
          bankBin: "",
          bankAccountNumber: "",
          bankAccountName: "",
          bankName: "",
        },
  })

  const bankBin = watch("bankBin")
  const bankAccountNumber = watch("bankAccountNumber")

  useEffect(() => {
    const unchangedAccount =
      currentAccount?.bankBin === bankBin &&
      currentAccount?.bankAccountNumber === bankAccountNumber &&
      currentAccount?.verified

    setVerified(Boolean(unchangedAccount))
  }, [bankAccountNumber, bankBin, currentAccount])

  const handleVerify = async () => {
    if (!bankBin || !bankAccountNumber) {
      return
    }
    clearError()
    try {
      const res = await verifyBankAccount({
        bankBin,
        bankAccountNumber,
      }).unwrap()

      if (res.data?.valid && res.data.accountName) {
        setValue("bankAccountName", res.data.accountName)
        setVerified(true)
        toast.success("Bank account verified!")
        return
      }

      setValue("bankAccountName", "")
      setVerified(false)
      toast.error("Bank account could not be verified.")
    } catch (err) {
      handleError(err)
    }
  }

  const onSubmit = async (data: PayoutFormValues) => {
    clearError()
    if (!verified) {
      toast.error("Please verify this bank account before saving.")
      return
    }

    try {
      await savePayoutAccount(data).unwrap()
      toast.success("Payout account saved!")
      setCurrentAccount({
        ...data,
        verified: true,
        verifiedAt: new Date().toISOString(),
      })
      setEditing(false)
    } catch (err) {
      handleError(err)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Payout Account
        </CardTitle>
        {!editing && (
          <Button
            id="settings-payout-edit-btn"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            className="gap-1"
          >
            <Pencil className="size-3" />
            Edit
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {!editing ? (
          /* ── View Mode ── */
          currentAccount ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">{currentAccount.bankName}</span>
                {currentAccount.verified ? (
                  <Badge
                    variant="default"
                    className="gap-1 bg-emerald-600/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400"
                  >
                    <BadgeCheck className="size-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <ShieldAlert className="size-3" />
                    Unverified
                  </Badge>
                )}
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Account No.</p>
                  <p className="font-mono font-medium tabular-nums">
                    {maskAccountNumber(currentAccount.bankAccountNumber)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Account Name</p>
                  <p className="font-medium">{currentAccount.bankAccountName}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Building2 className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No payout account configured
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
              >
                Set Up Now
              </Button>
            </div>
          )
        ) : (
          /* ── Edit Mode ── */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="payout-bank-bin">Bank BIN</Label>
                <Input
                  id="payout-bank-bin"
                  placeholder="e.g. 970436"
                  {...register("bankBin")}
                />
                {errors.bankBin && (
                  <p className="text-xs text-destructive">
                    {errors.bankBin.message}
                  </p>
                )}
              </Field>

              <Field>
                <Label htmlFor="payout-account-number">Account Number</Label>
                <Input
                  id="payout-account-number"
                  placeholder="e.g. 1234567890"
                  {...register("bankAccountNumber")}
                />
                {errors.bankAccountNumber && (
                  <p className="text-xs text-destructive">
                    {errors.bankAccountNumber.message}
                  </p>
                )}
              </Field>
            </div>

            <Button
              id="settings-payout-verify-btn"
              type="button"
              variant="outline"
              size="sm"
              disabled={
                isVerifying || !bankBin || !bankAccountNumber
              }
              onClick={handleVerify}
              className="gap-1"
            >
              {isVerifying ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <BadgeCheck className="size-3" />
              )}
              Verify Account
            </Button>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="payout-account-name">Account Name</Label>
                <Input
                  id="payout-account-name"
                  placeholder="Auto-filled after verify"
                  readOnly={verified}
                  className={verified ? "bg-muted/50" : undefined}
                  {...register("bankAccountName")}
                />
                {errors.bankAccountName && (
                  <p className="text-xs text-destructive">
                    {errors.bankAccountName.message}
                  </p>
                )}
              </Field>

              <Field>
                <Label htmlFor="payout-bank-name">Bank Name</Label>
                <Input
                  id="payout-bank-name"
                  placeholder="e.g. Vietcombank"
                  {...register("bankName")}
                />
                {errors.bankName && (
                  <p className="text-xs text-destructive">
                    {errors.bankName.message}
                  </p>
                )}
              </Field>
            </div>

            <div className="flex items-center gap-2">
              <Button
                id="settings-payout-save-btn"
                type="submit"
                size="sm"
                disabled={isSaving || !verified}
              >
                {isSaving ? (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                ) : (
                  <Save className="mr-1 size-3" />
                )}
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(false)
                  clearError()
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
