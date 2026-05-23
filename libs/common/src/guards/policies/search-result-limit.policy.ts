import { Injectable } from '@nestjs/common';
import type { PolicyContext, PolicyHandler } from '../policies.guard';

const DEFAULT_LIMIT = 10;

/** Policy: query/retrieval result count must fit inside the user's plan. */
@Injectable()
export class SearchResultLimitPolicy implements PolicyHandler {
  handle(ctx: PolicyContext): boolean {
    const { maxSearchResults } = ctx.planLimits;
    if (maxSearchResults === -1) return true;

    const requestedLimit = this.resolveRequestedLimit(ctx.extras);
    return requestedLimit <= maxSearchResults;
  }

  private resolveRequestedLimit(extras: Record<string, unknown>): number {
    const query = this.asRecord(extras.query);
    const body = this.asRecord(extras.body);
    const rawLimit =
      query.limit ?? body.limit ?? body.topK ?? body.top_k ?? body.k ?? DEFAULT_LIMIT;
    const parsedLimit =
      typeof rawLimit === 'number'
        ? rawLimit
        : Number.parseInt(String(rawLimit ?? DEFAULT_LIMIT), 10);

    return Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : DEFAULT_LIMIT;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }
}
