import type { PaginationMeta } from "@/types/api"

// ── Wallet ───────────────────────────────────────────────
export interface WalletBalance {
  walletId?: string
  userId?: string
  balanceInCents: string
  currency?: string
}

// ── Transactions ─────────────────────────────────────────
export type TransactionType =
  | "TOP_UP"
  | "PURCHASE_DEBIT"
  | "PURCHASE_CREDIT"
  | "WITHDRAW"
  | "REFUND_DEBIT"
  | "REFUND_CREDIT"

export type TransactionStatus = "PENDING" | "SUCCESS" | "FAILED"

export type PaymentProvider = "SEPAY" | "BANK_TRANSFER"

export interface Transaction {
  id: string
  type: TransactionType
  status: TransactionStatus
  provider?: PaymentProvider
  amountInCents: string
  currency: string
  createdAt: string
  confirmedAt?: string
  metadata?: Record<string, unknown>
}

export interface TransactionPage {
  data: Transaction[]
  meta: PaginationMeta
}

// ── Payout Account ───────────────────────────────────────
export interface PayoutAccount {
  bankBin: string
  bankAccountNumber: string
  bankAccountName: string
  bankName: string
  verified: boolean
  verifiedAt?: string
}

export interface BankProvider {
  id: string
  name: string
  shortName: string
  code: string
  bin: string
  logo?: string
  lookupSupported: boolean
  transferSupported: boolean
}

// ── Subscription ─────────────────────────────────────────
export type SubscriptionPlan =
  | "CREATOR_FREE"
  | "CREATOR_PRO"
  | "STUDENT_FREE"
  | "STUDENT_PRO"

export type SubscriptionStatus = "ACTIVE" | "CANCELLED" | "EXPIRED"

export interface Subscription {
  id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  startsAt: string
  expiresAt?: string
}

export type PlanFeatureValue = string | boolean

export interface SubscriptionPlanFeature {
  label: string
  free: PlanFeatureValue
  pro: PlanFeatureValue
}

export interface SubscriptionPlanTier {
  monthlyPriceCents: number
  priceInCents: number
  currency: string
  label: string
  cta: string
  description: string
  yearlyMonthlyPriceCents?: number
  badge?: string
}

export interface SubscriptionPlanGroup {
  title: string
  description: string
  iconKey: "Palette" | "Users"
  free: SubscriptionPlanTier
  pro: SubscriptionPlanTier & { yearlyMonthlyPriceCents: number; badge: string }
  features: SubscriptionPlanFeature[]
}

export interface SubscriptionComparisonRow {
  label: string
  creatorFree: PlanFeatureValue
  creatorPro: PlanFeatureValue
  studentFree: PlanFeatureValue
  studentPro: PlanFeatureValue
}

export interface SubscriptionComparisonCategory {
  category: string
  rows: SubscriptionComparisonRow[]
}

export interface SubscriptionFaqItem {
  q: string
  a: string
}

export interface SubscriptionPlanCatalogItem {
  code: SubscriptionPlan
  audience: "CREATOR" | "STUDENT"
  tier: "free" | "pro"
  pricing: {
    monthlyPriceCents: number
    yearlyMonthlyPriceCents?: number | null
    currency: string
  }
  limits: PlanLimits
  pbac: Record<string, unknown>
}

export interface SubscriptionPricingData {
  creatorPlans: SubscriptionPlanGroup
  studentPlans: SubscriptionPlanGroup
  comparisonCategories: SubscriptionComparisonCategory[]
  faqItems: SubscriptionFaqItem[]
  planCatalog?: SubscriptionPlanCatalogItem[]
}

export interface PlanLimits {
  storageBytes: number
  maxResources: number
  maxTutorials: number
  maxCollections: number
  canCreateContent: boolean
  maxSearchResults: number
}

export const DISPLAY_CURRENCY = "VND"

export const PLAN_DISPLAY_NAME_KEYS: Record<SubscriptionPlan, string> = {
  CREATOR_FREE: "billing.subscription.planCreatorFree",
  CREATOR_PRO: "billing.subscription.planCreatorPro",
  STUDENT_FREE: "billing.subscription.planStudentFree",
  STUDENT_PRO: "billing.subscription.planStudentPro",
}

// ── Currency Formatting ──────────────────────────────────
function normalizeCurrency(_currency = DISPLAY_CURRENCY) {
  return DISPLAY_CURRENCY
}

function localeForCurrency(currency: string) {
  return currency === "VND" ? "vi-VN" : "en-US"
}

export function getCurrencyFractionDigits(currency = DISPLAY_CURRENCY): number {
  const normalizedCurrency = normalizeCurrency(currency)

  try {
    const fractionDigits = new Intl.NumberFormat(localeForCurrency(normalizedCurrency), {
      style: "currency",
      currency: normalizedCurrency,
    }).resolvedOptions().maximumFractionDigits
    return fractionDigits ?? (normalizedCurrency === "VND" ? 0 : 2)
  } catch {
    return normalizedCurrency === "VND" ? 0 : 2
  }
}

export function getCurrencyMinorUnitFactor(currency = DISPLAY_CURRENCY): number {
  return 10 ** getCurrencyFractionDigits(currency)
}

export function minorUnitsToMajorUnit(
  minorUnits: string | number,
  currency = DISPLAY_CURRENCY
): number {
  const value =
    typeof minorUnits === "string" ? Number(minorUnits) : minorUnits
  return value / getCurrencyMinorUnitFactor(currency)
}

export function majorUnitToMinorUnits(
  amount: string | number,
  currency = DISPLAY_CURRENCY
): number {
  const value = typeof amount === "string" ? Number(amount) : amount
  return Math.max(
    0,
    Math.round((Number.isFinite(value) ? value : 0) * getCurrencyMinorUnitFactor(currency))
  )
}

export function formatVND(amount: string | number): string {
  const value = typeof amount === "string" ? Number(amount) : amount
  const safeValue = Number.isFinite(value) ? value : 0

  return `₫${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(safeValue)}`
}

export function formatCompactVND(amount: string | number): string {
  return formatVND(amount)
}

export function formatCurrencyFromCents(
  cents: string | number,
  currency = DISPLAY_CURRENCY
): string {
  const normalizedCurrency = normalizeCurrency(currency)
  const amount = minorUnitsToMajorUnit(cents, normalizedCurrency)
  const fractionDigits = getCurrencyFractionDigits(normalizedCurrency)

  if (normalizedCurrency === DISPLAY_CURRENCY) {
    return formatVND(amount)
  }

  return new Intl.NumberFormat(
    localeForCurrency(normalizedCurrency),
    {
      style: "currency",
      currency: normalizedCurrency,
      currencyDisplay: "code",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }
  ).format(amount)
}

export function centsToMajorUnit(
  cents: string | number,
  currency = DISPLAY_CURRENCY
): number {
  return minorUnitsToMajorUnit(cents, currency)
}
