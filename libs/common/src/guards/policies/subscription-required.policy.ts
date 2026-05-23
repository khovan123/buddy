import { SubscriptionPlan } from '@libs/contracts';
import { Injectable } from '@nestjs/common';
import type { PolicyContext, PolicyHandler } from '../policies.guard';

/** Policy: authenticated users must have selected a known subscription plan. */
@Injectable()
export class SubscriptionRequiredPolicy implements PolicyHandler {
  handle(ctx: PolicyContext): boolean {
    return Object.values(SubscriptionPlan).includes(ctx.subscriptionPlan);
  }
}
