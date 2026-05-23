"use client"

import { useEffect, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  BadgeCheck,
  Building2,
  CreditCard,
  Loader2,
  Pencil,
  Save,
  ShieldAlert,
  ShieldCheck,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useGlobalError } from "@/providers/error-provider"

import {
  useGetBankProvidersQuery,
  useSavePayoutAccountMutation,
  useVerifyBankAccountMutation,
} from "../services/billing-api"
import type { PayoutAccount } from "../types/billing-types"

// ── Validation ─────────────────────────────────────────────

const payoutSchema = z.object({
  bankBin: z.string().min(3, "Bank is required"),
  bankAccountNumber: z.string().min(5, "Account number is required"),
  bankAccountName: z.string().min(2, "Account name is required"),
  bankName: z.string().min(2, "Bank name is required"),
})

type PayoutFormValues = z.infer<typeof payoutSchema>

// ── Helpers ────────────────────────────────────────────────

function maskAccountNumber(num: string): string {
  if (num.length <= 4) {return num}
  return "•".repeat(num.length - 4) + num.slice(-4)
}

// ── Component ──────────────────────────────────────────────

interface PayoutSetupPageProps {
  initialAccount: PayoutAccount | null
}

export default function PayoutSetupPage({ initialAccount }: PayoutSetupPageProps) {
  const [account, setAccount] = useState(initialAccount)
  const [editing, setEditing] = useState(!initialAccount)
  const [verified, setVerified] = useState(Boolean(initialAccount?.verified))
  const { handleError, clearError } = useGlobalError()

  const [savePayoutAccount, { isLoading: isSaving }] =
    useSavePayoutAccountMutation()
  const [verifyBankAccount, { isLoading: isVerifying }] =
    useVerifyBankAccountMutation()
  const { data: bankProvidersData, isLoading: isLoadingBanks } =
    useGetBankProvidersQuery()

  useEffect(() => {
    setAccount(initialAccount)
    setVerified(Boolean(initialAccount?.verified))
  }, [initialAccount])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PayoutFormValues>({
    resolver: zodResolver(payoutSchema),
    values: account
      ? {
          bankBin: account.bankBin,
          bankAccountNumber: account.bankAccountNumber,
          bankAccountName: account.bankAccountName,
          bankName: account.bankName,
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
  const bankProviders = bankProvidersData?.data ?? []
  const selectedBank = bankProviders.find((bank) => bank.bin === bankBin)

  useEffect(() => {
    const unchangedAccount =
      account?.bankBin === bankBin &&
      account?.bankAccountNumber === bankAccountNumber &&
      account?.verified

    setVerified(Boolean(unchangedAccount))
  }, [account, bankAccountNumber, bankBin])

  const handleVerify = async () => {
    if (!bankBin || !bankAccountNumber) {return}
    clearError()
    setVerified(false)

    try {
      const res = await verifyBankAccount({
        bankBin,
        bankAccountNumber,
      }).unwrap()

      if (res.data?.valid && res.data.accountName) {
        setValue("bankAccountName", res.data.accountName)
        setValue("bankName", res.data.bankName ?? selectedBank?.name ?? "")
        setVerified(true)
        toast.success("Bank account verified successfully!")
        return
      }

      setValue("bankAccountName", "")
      setVerified(false)
      toast.error("Bank account could not be verified.")
    } catch (err) {
      handleError(err)
    }
  }

  const handleBankChange = (nextBankBin: string) => {
    const bank = bankProviders.find((item) => item.bin === nextBankBin)
    setValue("bankBin", nextBankBin, { shouldDirty: true, shouldValidate: true })
    setValue("bankName", bank?.name ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    })
    setValue("bankAccountName", "")
    setVerified(false)
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
      setAccount({
        ...data,
        verified: true,
        verifiedAt: new Date().toISOString(),
      })
      setEditing(false)
      setVerified(true)
    } catch (err) {
      handleError(err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Current Account Display */}
      {account && !editing && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CreditCard className="size-4" />
              Current Payout Account
            </CardTitle>
            <Button
              id="payout-edit-btn"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              className="gap-1"
            >
              <Pencil className="size-3" />
              Edit
            </Button>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                  <Building2 className="size-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{account.bankName}</p>
                  <p className="text-sm text-muted-foreground">
                    {account.bankAccountName}
                  </p>
                </div>
                {account.verified ? (
                  <Badge
                    variant="default"
                    className="gap-1 bg-emerald-600/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400"
                  >
                    <ShieldCheck className="size-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <ShieldAlert className="size-3" />
                    Unverified
                  </Badge>
                )}
              </div>

              <div className="grid gap-4 rounded-xl bg-muted/50 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Account Number</p>
                  <p className="font-mono text-sm font-medium tabular-nums">
                    {maskAccountNumber(account.bankAccountNumber)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bank BIN</p>
                  <p className="font-mono text-sm font-medium tabular-nums">
                    {account.bankBin}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup / Edit Form */}
      {editing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CreditCard className="size-4" />
              {account ? "Update Payout Account" : "Set Up Payout Account"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Step 1: Bank Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    1
                  </div>
                  <p className="text-sm font-medium">Enter bank details</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <Label htmlFor="payout-bank">Bank</Label>
                    <Select
                      value={bankBin}
                      onValueChange={handleBankChange}
                      disabled={isLoadingBanks || bankProviders.length === 0}
                    >
                      <SelectTrigger id="payout-bank" className="w-full">
                        <SelectValue
                          placeholder={
                            isLoadingBanks ? "Loading banks" : "Choose bank"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {bankProviders.map((bank) => (
                          <SelectItem key={bank.bin} value={bank.bin}>
                            {bank.shortName} - {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              </div>

              {/* Step 2: Verify */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold ${
                      verified
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    2
                  </div>
                  <p className="text-sm font-medium">Verify your account</p>
                  {verified && (
                    <Badge
                      variant="default"
                      className="gap-1 bg-emerald-600/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400"
                    >
                      <BadgeCheck className="size-3" />
                      Verified
                    </Badge>
                  )}
                </div>

                <Button
                  id="payout-verify-btn"
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isVerifying || !bankBin || !bankAccountNumber}
                  onClick={handleVerify}
                  className="gap-1.5"
                >
                  {isVerifying ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <BadgeCheck className="size-3" />
                  )}
                  Verify Account
                </Button>
              </div>

              {/* Step 3: Confirm & Save */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                    3
                  </div>
                  <p className="text-sm font-medium">Confirm and save</p>
                </div>

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
                      placeholder="Auto-filled from selected bank"
                      readOnly
                      className="bg-muted/50"
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
                    id="payout-save-btn"
                    type="submit"
                    size="sm"
                    disabled={isSaving || !verified}
                  >
                    {isSaving ? (
                      <Loader2 className="mr-1 size-3 animate-spin" />
                    ) : (
                      <Save className="mr-1 size-3" />
                    )}
                    Save Account
                  </Button>
                  {account && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(false)
                        setVerified(false)
                        clearError()
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
