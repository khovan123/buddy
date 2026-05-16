import { Injectable } from '@nestjs/common';
import type { PolicyContext, PolicyHandler } from '@libs/common';
import { ContentCountService } from '../../infrastructure/services/content-count.service';

/** Denies request if user has reached their plan's resource creation limit. */
@Injectable()
export class ResourceLimitPolicy implements PolicyHandler {
  constructor(private readonly countService: ContentCountService) {}

  async handle(ctx: PolicyContext): Promise<boolean> {
    const { maxResources } = ctx.planLimits;
    if (maxResources === -1) return true; // unlimited
    if (maxResources === 0) return false; // not allowed

    const current = await this.countService.countResources(ctx.userId);
    return current < maxResources;
  }
}

/** Denies request if user has reached their plan's tutorial creation limit. */
@Injectable()
export class TutorialLimitPolicy implements PolicyHandler {
  constructor(private readonly countService: ContentCountService) {}

  async handle(ctx: PolicyContext): Promise<boolean> {
    const { maxTutorials } = ctx.planLimits;
    if (maxTutorials === -1) return true;
    if (maxTutorials === 0) return false;

    const current = await this.countService.countTutorials(ctx.userId);
    return current < maxTutorials;
  }
}

/** Denies request if user has reached their plan's collection creation limit. */
@Injectable()
export class CollectionLimitPolicy implements PolicyHandler {
  constructor(private readonly countService: ContentCountService) {}

  async handle(ctx: PolicyContext): Promise<boolean> {
    const { maxCollections } = ctx.planLimits;
    if (maxCollections === -1) return true;
    if (maxCollections === 0) return false;

    const current = await this.countService.countCollections(ctx.userId);
    return current < maxCollections;
  }
}
