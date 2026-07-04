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
export function formatVND(cents: string | number): string {
  const value = typeof cents === "string" ? Number(cents) : cents
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: DISPLAY_CURRENCY,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatCurrencyFromCents(
  cents: string | number,
  currency = DISPLAY_CURRENCY
): string {
  const value = typeof cents === "string" ? Number(cents) : cents
  const normalizedCurrency = currency.toUpperCase()
  const amount = value / 100

  return new Intl.NumberFormat(
    normalizedCurrency === "VND" ? "vi-VN" : "en-US",
    {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: normalizedCurrency === "VND" ? 0 : 2,
    }
  ).format(amount)
}

export function centsToMajorUnit(cents: string | number): number {
  const value = typeof cents === "string" ? Number(cents) : cents
  return value / 100
}
