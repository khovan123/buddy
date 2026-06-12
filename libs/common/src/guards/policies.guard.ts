import {
  DEFAULT_PLAN_LIMITS,
  SubscriptionPlan,
  getFallbackPlanLimits,
  isCreatorSubscriptionPlan,
  isSubscriptionPlan,
  type PlanLimits,
  type SubscriptionPlanDetails,
  type SubscriptionPlan as SubscriptionPlanType,
} from '@libs/contracts';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
  SetMetadata,
  Type,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';

// ── Policy contract ──────────────────────────────────────────────────

/** Context passed to every policy handler for evaluation. */
export interface PolicyContext {
  userId: string;
  roles: string[];
  subscriptionPlan: SubscriptionPlanType;
  planLimits: PlanLimits;
  /** Extra request-scoped data (e.g. file size for storage checks). */
  extras: Record<string, unknown>;
}

/**
 * Implement this interface to define a PBAC policy.
 * Policies are resolved from the NestJS DI container, so they can inject
 * services (e.g. repositories for counting resources).
 */
export interface PolicyHandler {
  handle(context: PolicyContext): boolean | Promise<boolean>;
}

export interface PlanLimitsResolver {
  resolvePlanLimits(
    plan: SubscriptionPlanType,
    context: Pick<PolicyContext, 'userId' | 'roles' | 'extras'>,
  ): PlanLimits | null | Promise<PlanLimits | null>;
}

export const PBAC_LIMITS_RESOLVER = Symbol('PBAC_LIMITS_RESOLVER');

type PolicyUserClaims = {
  sub: string;
  roles?: string[];
  subscriptionPlan?: string;
  subscriptionPlanDetails?: SubscriptionPlanDetails;
};

// ── Decorator ────────────────────────────────────────────────────────

export const POLICIES_KEY = 'POLICIES';

/**
 * Decorator to attach one or more PolicyHandler classes to a route.
 * All policies must pass for the request to proceed.
 *
 * @example
 * @RequirePolicy(CreatorOnlyPolicy, ResourceLimitPolicy)
 * @Post()
 * createResource() { ... }
 */
export const RequirePolicy = (...handlers: Type<PolicyHandler>[]) =>
  SetMetadata(POLICIES_KEY, handlers);

// ── Guard ────────────────────────────────────────────────────────────

/**
 * PBAC guard — evaluates all policies declared via @RequirePolicy().
 * Must run AFTER JwtAuthGuard so `request.user` is populated.
 *
 * Usage: `@UseGuards(JwtAuthGuard, PoliciesGuard)`
 */
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
    @Optional()
    @Inject(PBAC_LIMITS_RESOLVER)
    private readonly planLimitsResolver?: PlanLimitsResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handlerClasses =
      this.reflector.getAllAndOverride<Type<PolicyHandler>[]>(POLICIES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (handlerClasses.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as PolicyUserClaims | undefined;

    if (!user) {
      throw new ForbiddenException('Authentication required for policy evaluation');
    }

    const plan = this.resolveSubscriptionPlan(user.subscriptionPlan, user.roles ?? []);
    const extras = {
      body: request.body,
      headers: request.headers,
      params: request.params,
      query: request.query,
    };

    const policyCtx: PolicyContext = {
      userId: user.sub,
      roles: user.roles ?? [],
      subscriptionPlan: plan,
      planLimits: await this.resolvePlanLimits(plan, user, {
        userId: user.sub,
        roles: user.roles ?? [],
        extras,
      }),
      extras,
    };

    for (const HandlerClass of handlerClasses) {
      // Resolve from DI — allows policies to inject repositories/services
      const handler = await this.moduleRef.resolve(HandlerClass);
      const allowed = await handler.handle(policyCtx);

      if (!allowed) {
        throw new ForbiddenException(`Policy denied: ${HandlerClass.name}`);
      }
    }

    return true;
  }

  private resolveSubscriptionPlan(plan: string | undefined, roles: string[]): SubscriptionPlanType {
    const normalizedPlan = this.normalizePlan(plan);

    if (roles.some((role) => this.isCreatorRole(role)) && !this.isCreatorPlan(normalizedPlan)) {
      return SubscriptionPlan.CREATOR_FREE;
    }

    if (normalizedPlan) {
      return normalizedPlan;
    }

    return SubscriptionPlan.STUDENT_FREE;
  }

  private async resolvePlanLimits(
    plan: SubscriptionPlanType,
    user: PolicyUserClaims,
    context: Pick<PolicyContext, 'userId' | 'roles' | 'extras'>,
  ): Promise<PlanLimits> {
    const claimLimits =
      user.subscriptionPlanDetails?.code === plan
        ? this.normalizeClaimLimits(user.subscriptionPlanDetails.limits)
        : null;

    if (!this.planLimitsResolver) {
      return claimLimits ?? getFallbackPlanLimits(plan);
    }

    return (
      (await this.planLimitsResolver.resolvePlanLimits(plan, context)) ??
      claimLimits ??
      getFallbackPlanLimits(plan)
    );
  }

  private normalizeClaimLimits(limits: unknown): PlanLimits | null {
    if (!limits || typeof limits !== 'object') return null;

    const candidate = limits as Partial<Record<keyof PlanLimits, unknown>>;
    if (
      typeof candidate.storageBytes !== 'number' ||
      typeof candidate.maxResources !== 'number' ||
      typeof candidate.maxTutorials !== 'number' ||
      typeof candidate.maxCollections !== 'number' ||
      typeof candidate.canCreateContent !== 'boolean' ||
      typeof candidate.maxSearchResults !== 'number'
    ) {
      return null;
    }

    return {
      storageBytes: candidate.storageBytes,
      maxResources: candidate.maxResources,
      maxTutorials: candidate.maxTutorials,
      maxCollections: candidate.maxCollections,
      canCreateContent: candidate.canCreateContent,
      maxSearchResults: candidate.maxSearchResults,
    };
  }

  private normalizePlan(plan: string | undefined): SubscriptionPlanType | undefined {
    const normalized = plan
      ?.trim()
      .replace(/[\s-]+/g, '_')
      .toUpperCase();
    if (!normalized) return undefined;
    return isSubscriptionPlan(normalized) ? normalized : undefined;
  }

  private isCreatorPlan(plan: SubscriptionPlanType | undefined): boolean {
    return plan ? isCreatorSubscriptionPlan(plan) : false;
  }

  private isCreatorRole(role: string): boolean {
    const normalized = role
      .trim()
      .replace(/[\s-]+/g, '_')
      .toUpperCase();
    return normalized === 'CREATOR' || normalized.startsWith('CREATOR_');
  }
}
