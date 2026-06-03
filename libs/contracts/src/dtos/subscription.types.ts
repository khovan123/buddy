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

export function isSubscriptionPlan(plan: string | undefined): plan is SubscriptionPlan {
  return Object.values(SubscriptionPlan).includes(plan as SubscriptionPlan);
}

export function isCreatorSubscriptionPlan(plan: SubscriptionPlan): boolean {
  return plan === SubscriptionPlan.CREATOR_FREE || plan === SubscriptionPlan.CREATOR_PRO;
}
