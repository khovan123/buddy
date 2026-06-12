/**
 * Subscription plan identifiers matching the pricing page tiers.
 * Used in JWT claims, billing-service DB, and PBAC policy evaluation.
 */
export enum SubscriptionPlan {
  CREATOR_FREE = 'CREATOR_FREE',
  CREATOR_PRO = 'CREATOR_PRO',
  STUDENT_FREE = 'STUDENT_FREE',
  STUDENT_PRO = 'STUDENT_PRO',
}

/** Quantitative limits enforced by PBAC policies per plan. */
export type PlanLimits = {
  /** Max storage in bytes. */
  storageBytes: number;
  /** Max resources a creator can create. -1 = unlimited, 0 = not allowed. */
  maxResources: number;
  /** Max tutorials a creator can create. */
  maxTutorials: number;
  /** Max collections a creator can create. */
  maxCollections: number;
  /** Whether the plan allows creating content at all (creator-only). */
  canCreateContent: boolean;
  /** Max search results per query. -1 = unlimited. */
  maxSearchResults: number;
};

/** Billing-backed plan details that can be embedded in JWT claims. */
export type SubscriptionPlanDetails = {
  code: SubscriptionPlan;
  limits: PlanLimits;
  pbac?: Record<string, unknown>;
};

/**
 * Safe fallback used only when a service cannot resolve catalog-backed limits.
 * Per-plan values are stored in billing-service SubscriptionPlanCatalog.
 */
export const DEFAULT_PLAN_LIMITS: PlanLimits = {
  storageBytes: 0,
  maxResources: 0,
  maxTutorials: 0,
  maxCollections: 0,
  canCreateContent: false,
  maxSearchResults: 0,
};

const MB = 1024 * 1024;
const GB = 1024 * MB;

/**
 * Static fallback for known plans when billing-service plan catalog is unavailable.
 * Billing-service remains the source of truth for mutable limits.
 */
export const FALLBACK_PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  [SubscriptionPlan.CREATOR_FREE]: {
    storageBytes: 500 * MB,
    maxResources: 5,
    maxTutorials: 3,
    maxCollections: 2,
    canCreateContent: true,
    maxSearchResults: 20,
  },
  [SubscriptionPlan.CREATOR_PRO]: {
    storageBytes: 50 * GB,
    maxResources: -1,
    maxTutorials: -1,
    maxCollections: -1,
    canCreateContent: true,
    maxSearchResults: -1,
  },
  [SubscriptionPlan.STUDENT_FREE]: {
    storageBytes: 1 * GB,
    maxResources: 0,
    maxTutorials: 0,
    maxCollections: 0,
    canCreateContent: false,
    maxSearchResults: 10,
  },
  [SubscriptionPlan.STUDENT_PRO]: {
    storageBytes: 25 * GB,
    maxResources: 0,
    maxTutorials: 0,
    maxCollections: 0,
    canCreateContent: false,
    maxSearchResults: -1,
  },
};

export function getFallbackPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return FALLBACK_PLAN_LIMITS[plan] ?? DEFAULT_PLAN_LIMITS;
}

export function isSubscriptionPlan(plan: string | undefined): plan is SubscriptionPlan {
  return Object.values(SubscriptionPlan).includes(plan as SubscriptionPlan);
}

export function isCreatorSubscriptionPlan(plan: SubscriptionPlan): boolean {
  return plan === SubscriptionPlan.CREATOR_FREE || plan === SubscriptionPlan.CREATOR_PRO;
}
