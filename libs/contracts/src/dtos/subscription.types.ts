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

const MB = 1024 * 1024;
const GB = 1024 * MB;

/**
 * Plan limits lookup table. Single source of truth for all services.
 * Values match the pricing page: {@link https://buddy.edu.vn/pricing}
 */
export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
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

/** Resolve plan limits with a safe fallback for unknown plans. */
export function getPlanLimits(plan: string | undefined): PlanLimits {
  const key = plan as SubscriptionPlan;
  return PLAN_LIMITS[key] ?? PLAN_LIMITS[SubscriptionPlan.STUDENT_FREE];
}
