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
  price: number
  label: string
  cta: string
  description: string
  yearlyPrice?: number
  badge?: string
}

export interface SubscriptionPlanGroup {
  title: string
  description: string
  iconKey: "Palette" | "Users"
  free: SubscriptionPlanTier
  pro: SubscriptionPlanTier & { yearlyPrice: number; badge: string }
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

// ── Plan Limits (mirrored from backend contracts) ────────
export interface PlanLimits {
  storageBytes: number
  maxResources: number
  maxTutorials: number
  maxCollections: number
  canCreateContent: boolean
  maxSearchResults: number
}

const MB = 1024 * 1024
const GB = 1024 * MB

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  CREATOR_FREE: {
    storageBytes: 500 * MB,
    maxResources: 5,
    maxTutorials: 3,
    maxCollections: 2,
    canCreateContent: true,
    maxSearchResults: 20,
  },
  CREATOR_PRO: {
    storageBytes: 50 * GB,
    maxResources: -1,
    maxTutorials: -1,
    maxCollections: -1,
    canCreateContent: true,
    maxSearchResults: -1,
  },
  STUDENT_FREE: {
    storageBytes: 1 * GB,
    maxResources: 0,
    maxTutorials: 0,
    maxCollections: 0,
    canCreateContent: false,
    maxSearchResults: 10,
  },
  STUDENT_PRO: {
    storageBytes: 25 * GB,
    maxResources: 0,
    maxTutorials: 0,
    maxCollections: 0,
    canCreateContent: false,
    maxSearchResults: -1,
  },
}

export const PLAN_DISPLAY_NAMES: Record<SubscriptionPlan, string> = {
  CREATOR_FREE: "Creator Free",
  CREATOR_PRO: "Creator Pro",
  STUDENT_FREE: "Student Free",
  STUDENT_PRO: "Student Pro",
}

// ── Currency Formatting ──────────────────────────────────
export function formatVND(cents: string | number): string {
  const value = typeof cents === "string" ? Number(cents) : cents
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value)
}
