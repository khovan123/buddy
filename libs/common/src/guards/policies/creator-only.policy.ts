import { Injectable } from '@nestjs/common';
import type { PolicyContext, PolicyHandler } from '../policies.guard';

/**
 * Policy: users need a plan whose resolved limits allow content creation.
 */
@Injectable()
export class CreatorOnlyPolicy implements PolicyHandler {
  handle(ctx: PolicyContext): boolean {
    return ctx.planLimits.canCreateContent;
  }
}
