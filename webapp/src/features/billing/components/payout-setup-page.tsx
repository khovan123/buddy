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

  useEffect(() => {
    const unchangedAccount =
      account?.bankBin === bankBin &&
      account?.bankAccountNumber === bankAccountNumber &&
      account?.verified

    if (unchangedAccount) {
      setVerified(true)
      return
    }

    if (!bankBin || bankAccountNumber.length < 5) {
      setValue("bankAccountName", "")
      setVerified(false)
      return
    }

    let active = true
    const timeout = setTimeout(() => {
      clearError()
      setVerified(false)

      void verifyBankAccount({
        bankBin,
        bankAccountNumber,
      })
        .unwrap()
        .then((res) => {
          if (!active) {
            return
          }

          if (res.data?.valid && res.data.accountName) {
            setValue("bankAccountName", res.data.accountName, {
              shouldDirty: true,
              shouldValidate: true,
            })
            setValue("bankName", res.data.bankName ?? selectedBank?.name ?? "", {
              shouldDirty: true,
              shouldValidate: true,
            })
            setVerified(true)
            return
          }

          setValue("bankAccountName", "")
          setVerified(false)
        })
        .catch((err) => {
          if (active) {
            handleError(err)
          }
        })
    }, 600)

    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [
    account,
    bankAccountNumber,
    bankBin,
    clearError,
    handleError,
    selectedBank?.name,
    setValue,
    verifyBankAccount,
  ])

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
                  <p className="text-xs text-muted-foreground">Bank number</p>
                  <p className="font-mono text-sm font-medium tabular-nums">
                    {maskAccountNumber(account.bankAccountNumber)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="text-sm font-medium">{account.bankAccountName}</p>
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
              <div className="space-y-4">
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
                    <Label htmlFor="payout-account-number">Bank number</Label>
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

              <div className="space-y-4">
                <div className="grid gap-4">
                  <Field>
                    <Label htmlFor="payout-account-name">Full Name</Label>
                    <Input
                      id="payout-account-name"
                      placeholder={
                        isVerifying
                          ? "Verifying account..."
                          : "Auto-filled after verification"
                      }
                      readOnly
                      className="bg-muted/50"
                      {...register("bankAccountName")}
                    />
                    {errors.bankAccountName && (
                      <p className="text-xs text-destructive">
                        {errors.bankAccountName.message}
                      </p>
                    )}
                  </Field>
                </div>

                <div className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
                  {isVerifying ? (
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      Verifying account
                    </>
                  ) : verified ? (
                    <>
                      <BadgeCheck className="size-3 text-emerald-600" />
                      Verified
                    </>
                  ) : bankBin && bankAccountNumber ? (
                    "Waiting for account verification"
                  ) : (
                    "Choose a bank and enter bank number to verify"
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    id="payout-save-btn"
                    type="submit"
                    size="sm"
                    disabled={isSaving || isVerifying || !verified}
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
