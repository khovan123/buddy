import { Injectable } from '@nestjs/common';
import { SubscriptionPlan } from '@libs/contracts';
import type { PolicyContext, PolicyHandler } from '../policies.guard';

/**
 * Policy: users need either an explicit creator role or a creator plan, and
 * the resolved plan limits must allow content creation.
 */
@Injectable()
export class CreatorOnlyPolicy implements PolicyHandler {
  handle(ctx: PolicyContext): boolean {
    const hasCreatorRole = ctx.roles.includes('creator');
    const hasCreatorPlan =
      ctx.subscriptionPlan === SubscriptionPlan.CREATOR_FREE ||
      ctx.subscriptionPlan === SubscriptionPlan.CREATOR_PRO;

    return ctx.planLimits.canCreateContent && (hasCreatorRole || hasCreatorPlan);
  }
}
