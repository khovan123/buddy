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

import { revalidateCacheTag } from "@/app/actions/revalidate"
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
import { useI18n } from "@/i18n/language-provider"
import { useGlobalError } from "@/providers/error-provider"

import {
  useGetBankProvidersQuery,
  useSavePayoutAccountMutation,
  useVerifyBankAccountMutation,
} from "../services/billing-api"
import type { PayoutAccount } from "../types/billing-types"

// ── Validation ─────────────────────────────────────────────

type PayoutFormValues = {
  bankBin: string
  bankAccountNumber: string
  bankAccountName: string
  bankName: string
}

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
  const { t } = useI18n()
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

  const payoutSchema = z.object({
    bankBin: z.string().min(3, t("billing.payout.bankRequired")),
    bankAccountNumber: z
      .string()
      .min(5, t("billing.payout.accountNumberRequired")),
    bankAccountName: z
      .string()
      .min(2, t("billing.payout.accountNameRequired")),
    bankName: z.string().min(2, t("billing.payout.bankNameRequired")),
  })

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
      toast.error(t("billing.payout.verifyBeforeSave"))
      return
    }

    try {
      await savePayoutAccount(data).unwrap()
      await revalidateCacheTag("payout-account")
      toast.success(t("billing.payout.saved"))
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
              {t("billing.payout.currentAccount")}
            </CardTitle>
            <Button
              id="payout-edit-btn"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              className="gap-1"
            >
              <Pencil className="size-3" />
              {t("billing.payout.edit")}
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
                    {t("billing.payout.verified")}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <ShieldAlert className="size-3" />
                    {t("billing.payout.unverified")}
                  </Badge>
                )}
              </div>

              <div className="grid gap-4 rounded-xl bg-muted/50 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">{t("billing.payout.bankNumber")}</p>
                  <p className="font-mono text-sm font-medium tabular-nums">
                    {maskAccountNumber(account.bankAccountNumber)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("billing.payout.fullName")}</p>
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
              {account
                ? t("billing.payout.updateAccount")
                : t("billing.payout.setupAccount")}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <Label htmlFor="payout-bank">{t("billing.payout.bank")}</Label>
                    <Select
                      value={bankBin}
                      onValueChange={handleBankChange}
                      disabled={isLoadingBanks || bankProviders.length === 0}
                    >
                      <SelectTrigger id="payout-bank" className="w-full">
                        <SelectValue
                          placeholder={
                            isLoadingBanks
                              ? t("billing.payout.loadingBanks")
                              : t("billing.payout.chooseBank")
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
                    <Label htmlFor="payout-account-number">{t("billing.payout.bankNumber")}</Label>
                    <Input
                      id="payout-account-number"
                      placeholder={t("billing.payout.accountNumberPlaceholder")}
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
                    <Label htmlFor="payout-account-name">{t("billing.payout.fullName")}</Label>
                    <Input
                      id="payout-account-name"
                      placeholder={
                        isVerifying
                          ? t("billing.payout.verifyingAccount")
                          : t("billing.payout.autofillAfterVerification")
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
                      {t("billing.payout.verifyingAccountShort")}
                    </>
                  ) : verified ? (
                    <>
                      <BadgeCheck className="size-3 text-emerald-600" />
                      {t("billing.payout.verified")}
                    </>
                  ) : bankBin && bankAccountNumber ? (
                    t("billing.payout.waitingVerification")
                  ) : (
                    t("billing.payout.chooseBankAndNumber")
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
                    {t("common.save")}
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
                      {t("common.cancel")}
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
