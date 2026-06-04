import { DEFAULT_PLAN_LIMITS, type PlanLimits, type SubscriptionPlan } from '@libs/contracts';
import type { PlanLimitsResolver, PolicyContext } from '@libs/common';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type CatalogItem = {
  code: SubscriptionPlan;
  limits: PlanLimits;
};

type CatalogResponse = {
  data?: {
    planCatalog?: CatalogItem[];
  };
};

@Injectable()
export class BillingPlanLimitsResolver implements PlanLimitsResolver {
  private readonly logger = new Logger(BillingPlanLimitsResolver.name);
  private readonly cacheTtlMs = 30_000;
  private cachedAt = 0;
  private cache = new Map<SubscriptionPlan, PlanLimits>();

  constructor(private readonly config: ConfigService) {}

  async resolvePlanLimits(
    plan: SubscriptionPlan,
    _context: Pick<PolicyContext, 'userId' | 'roles' | 'extras'>,
  ): Promise<PlanLimits> {
    await this.refreshIfNeeded();
    return this.cache.get(plan) ?? DEFAULT_PLAN_LIMITS;
  }

  private async refreshIfNeeded() {
    if (Date.now() - this.cachedAt < this.cacheTtlMs && this.cache.size > 0) {
      return;
    }

    const baseUrl = this.config.get<string>('BILLING_SERVICE_URL', 'http://0.0.0.0:3006');

    try {
      const response = await fetch(`${baseUrl}/v1/billing/subscription/plans`);
      if (!response.ok) {
        this.logger.warn(`Billing plan catalog returned HTTP ${response.status}`);
        return;
      }

      const payload = (await response.json()) as CatalogResponse;
      const catalog = payload.data?.planCatalog ?? [];

      this.cache = new Map(catalog.map((item) => [item.code, item.limits]));
      this.cachedAt = Date.now();
    } catch (error) {
      this.logger.warn(
        `Failed to refresh billing plan limits: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
