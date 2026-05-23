import type { PlanLimits, SubscriptionPlan as SubscriptionPlanType } from '@libs/contracts';
import { getPlanLimits } from '@libs/contracts';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
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
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handlerClasses =
      this.reflector.getAllAndOverride<Type<PolicyHandler>[]>(POLICIES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (handlerClasses.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required for policy evaluation');
    }

    const plan = user.subscriptionPlan as SubscriptionPlanType;

    const policyCtx: PolicyContext = {
      userId: user.sub,
      roles: user.roles ?? [],
      subscriptionPlan: plan,
      planLimits: getPlanLimits(plan),
      extras: {
        body: request.body,
        headers: request.headers,
        params: request.params,
        query: request.query,
      },
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
}
