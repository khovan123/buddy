import { Injectable } from '@nestjs/common';
import type { PolicyContext, PolicyHandler } from '../policies.guard';

/**
 * Policy: Only users with 'creator' role AND a plan that allows content
 * creation can proceed. Students are always denied.
 */
@Injectable()
export class CreatorOnlyPolicy implements PolicyHandler {
  handle(ctx: PolicyContext): boolean {
    return ctx.roles.includes('creator') && ctx.planLimits.canCreateContent;
  }
}
