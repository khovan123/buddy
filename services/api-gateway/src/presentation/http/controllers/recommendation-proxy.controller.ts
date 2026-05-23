import {
  AppLogger,
  JwtAuthGuard,
  PoliciesGuard,
  Public,
  RequirePolicy,
  SearchResultLimitPolicy,
  SubscriptionRequiredPolicy,
  type JwtPayload,
} from '@libs/common';
import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import {
  ApiComposerService,
  type CompositionRequest,
} from '../../../infrastructure/http/api-composer.service';
import { HttpProxyService } from '../../../infrastructure/http/http-proxy.service';

const CONTENT_HYDRATION_REQUEST_TIMEOUT_MS = 3_500;
const CONTENT_HYDRATION_TOTAL_TIMEOUT_MS = 8_000;
const INTERNAL_CONTENT_FIELDS = new Set([
  'primarys3key',
  's3key',
  'filekey',
  'storagekey',
  'signedurl',
  'downloadurl',
  'deletedat',
  'metadata',
]);

/** Proxy controller forwarding requests to recommendation-service (Python/FastAPI on port 3009). */
@Controller({ path: 'recommendations', version: '1' })
export class RecommendationProxyController {
  private readonly logger = new AppLogger(RecommendationProxyController.name);

  constructor(
    private readonly proxy: HttpProxyService,
    private readonly composer: ApiComposerService,
  ) {}

  // ── Composed (hydrated) Endpoints ─────────────────────────────────

  /**
   * Executes the get enriched recommendations operation.
   *
   * Flow: recommendation-service → group by itemType → content-service (parallel) → merge.
   *
   * @param req - The req parameter
   * @param userId - The userId parameter
   * @param limit - The limit parameter
   * @param contentType - The contentType parameter
   */
  @Get()
  @Public()
  async getRecommendations(
    @Req() req: FastifyRequest,
    @Query('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('contentType') contentType?: string,
  ) {
    return this.getHydratedRecommendations(req, userId, limit, contentType);
  }

  @Get('for-you')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @RequirePolicy(SubscriptionRequiredPolicy, SearchResultLimitPolicy)
  async getRecommendationsForCurrentUser(
    @Req() req: FastifyRequest,
    @Query('limit') limit?: string,
    @Query('contentType') contentType?: string,
  ) {
    const user = (req as FastifyRequest & { user: JwtPayload }).user;
    return this.getHydratedRecommendations(req, user.sub, limit, contentType);
  }

  private async getHydratedRecommendations(
    req: FastifyRequest,
    userId: string,
    limit?: string,
    contentType?: string,
  ) {
    const query: Record<string, string> = { userId };
    if (limit) query.limit = limit;
    if (contentType) query.contentType = contentType;

    // Step 1: Get recommendation scores from recommendation-service
    const recResponse = (await this.proxy.forward(req, {
      service: 'recommendation',
      path: '/v1/recommendation/recommend',
      method: 'GET',
      query,
    })) as {
      userId: string;
      strategy: string;
      interactionCount: number;
      phase: string;
      recommendations: Array<{
        itemId: string;
        itemType: string;
        score: number;
        reasons: string[];
      }>;
    };

    // Step 2: Hydrate with content details
    const items = await this.hydrateItems(req, recResponse.recommendations);

    return {
      userId: recResponse.userId,
      strategy: recResponse.strategy,
      interactionCount: recResponse.interactionCount,
      phase: recResponse.phase,
      recommendations: items,
    };
  }

  /**
   * Executes the get enriched trending operation.
   *
   * Flow: recommendation-service → group by itemType → content-service (parallel) → merge.
   *
   * @param req - The req parameter
   * @param majorId - The majorId parameter
   * @param days - The days parameter
   * @param limit - The limit parameter
   */
  @Get('trending')
  @Public()
  async getTrending(
    @Req() req: FastifyRequest,
    @Query('majorId') majorId?: string,
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    const query: Record<string, string> = {};
    if (majorId) query.majorId = majorId;
    if (days) query.days = days;
    if (limit) query.limit = limit;

    // Step 1: Get trending items from recommendation-service
    const trendingResponse = (await this.proxy.forward(req, {
      service: 'recommendation',
      path: '/v1/recommendation/trending',
      method: 'GET',
      query,
    })) as {
      majorId: string | null;
      period: string;
      items: Array<{
        itemId: string;
        itemType: string;
        totalInteractions: number;
        avgRating: number;
      }>;
    };

    // Step 2: Hydrate with content details
    const items = await this.hydrateItems(req, trendingResponse.items);

    return {
      majorId: trendingResponse.majorId,
      period: trendingResponse.period,
      items,
    };
  }

  // ── Pass-through Endpoints ────────────────────────────────────────

  /**
   * Executes the get health operation.
   *
   * @param req - The req parameter
   */
  @Get('health')
  @Public()
  getHealth(@Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'recommendation',
      path: '/v1/health',
      method: 'GET',
    });
  }

  // ── Model Management (admin-only) ────────────────────────────────

  /**
   * Executes the train model operation.
   *
   * @param req - The req parameter
   * @param epochs - The epochs parameter
   * @param batchSize - The batchSize parameter
   */
  @Post('model/train')
  @UseGuards(JwtAuthGuard)
  trainModel(
    @Req() req: FastifyRequest,
    @Query('epochs') epochs?: string,
    @Query('batch_size') batchSize?: string,
  ) {
    const query: Record<string, string> = {};
    if (epochs) query.epochs = epochs;
    if (batchSize) query.batch_size = batchSize;

    return this.proxy.forward(req, {
      service: 'recommendation',
      path: '/v1/recommendation/model/train',
      method: 'POST',
      query,
    });
  }

  /**
   * Executes the reload model operation.
   *
   * @param req - The req parameter
   */
  @Post('model/reload')
  @UseGuards(JwtAuthGuard)
  reloadModel(@Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'recommendation',
      path: '/v1/recommendation/model/reload',
      method: 'POST',
    });
  }

  /**
   * Executes the get model versions operation.
   *
   * @param req - The req parameter
   */
  @Get('model/versions')
  @UseGuards(JwtAuthGuard)
  getModelVersions(@Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'recommendation',
      path: '/v1/recommendation/model/versions',
      method: 'GET',
    });
  }

  /**
   * Executes the get model info operation.
   *
   * @param req - The req parameter
   */
  @Get('model/info')
  @UseGuards(JwtAuthGuard)
  getModelInfo(@Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'recommendation',
      path: '/v1/recommendation/model/info',
      method: 'GET',
    });
  }

  /**
   * Executes the rebuild index operation.
   *
   * @param req - The req parameter
   */
  @Post('model/rebuild-index')
  @UseGuards(JwtAuthGuard)
  rebuildIndex(@Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'recommendation',
      path: '/v1/recommendation/model/rebuild-index',
      method: 'POST',
    });
  }

  // ── Private helpers ───────────────────────────────────────────────

  /**
   * Hydrate a list of recommendation/trending items with full content from content-service.
   * Groups by itemType, fetches items in batch using /by-ids endpoint, merges score data with content.
   *
   * Optimization: Instead of one request per item, group items by type and use batch endpoints:
   * - GET /v1/resources/by-ids?ids=id1,id2,id3
   * - GET /v1/tutorials/by-ids?ids=id1,id2,id3
   * - GET /v1/collections/by-ids?ids=id1,id2,id3
   */
  private async hydrateItems(
    req: FastifyRequest,
    items: Array<{ itemId: string; itemType: string; [k: string]: unknown }>,
  ): Promise<Array<{ itemId: string; itemType: string; content: unknown; [k: string]: unknown }>> {
    if (!items.length) return [];

    // Group items by type
    const itemsByType = this.groupItemsByType(items);

    // Build batch composition requests — one per item type group using GET with query params
    const compositionRequests: CompositionRequest[] = Array.from(itemsByType.entries()).map(
      ([type, typeItems]) => ({
        key: `batch_${type}`,
        options: {
          service: 'content' as const,
          path: this.getBatchContentPath(
            type,
            typeItems.map((item) => item.itemId),
          ),
          method: 'GET' as const,
          timeoutMs: CONTENT_HYDRATION_REQUEST_TIMEOUT_MS,
        },
        optional: true, // If one batch fails, don't break the whole response
      }),
    );

    const composed = await this.resolveHydration(req, compositionRequests);

    // Reconstruct the original item list with hydrated content
    return items.map((item) => {
      const type = item.itemType;
      const batchKey = `batch_${type}`;
      const batchResponse = composed[batchKey] as
        | {
            data?: Array<{ id: string; [k: string]: unknown }>;
          }
        | null
        | undefined;
      const batchResults = batchResponse?.data ?? [];

      // Find the corresponding content from batch results
      const content = batchResults.find(
        (result: { id: string; [k: string]: unknown }) => result.id === item.itemId,
      );

      return {
        ...item,
        content: content ? this.sanitizeContent(content) : null,
      };
    });
  }

  private async resolveHydration(
    req: FastifyRequest,
    compositionRequests: CompositionRequest[],
  ): Promise<Record<string, unknown>> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        this.composer.compose(req, compositionRequests),
        new Promise<Record<string, unknown>>((resolve) => {
          timeout = setTimeout(() => resolve({}), CONTENT_HYDRATION_TOTAL_TIMEOUT_MS);
        }),
      ]);
    } catch (error) {
      this.logger.warn(
        `Recommendation content hydration failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {};
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private sanitizeContent(content: unknown): unknown {
    if (Array.isArray(content)) {
      return content.map((value) => this.sanitizeContent(value));
    }

    if (!content || typeof content !== 'object') {
      return content;
    }

    return Object.fromEntries(
      Object.entries(content as Record<string, unknown>)
        .filter(([key]) => !this.isInternalContentField(key))
        .map(([key, value]) => [key, this.sanitizeContent(value)]),
    );
  }

  private isInternalContentField(key: string): boolean {
    const normalized = key.toLowerCase();
    return (
      INTERNAL_CONTENT_FIELDS.has(normalized) ||
      normalized.startsWith('_') ||
      normalized.includes('s3') ||
      normalized.includes('signed') ||
      normalized.includes('download')
    );
  }

  /**
   * Group items by their itemType for batch processing.
   */
  private groupItemsByType(
    items: Array<{ itemId: string; itemType: string; [k: string]: unknown }>,
  ): Map<string, typeof items> {
    const grouped = new Map<string, typeof items>();

    for (const item of items) {
      const type = item.itemType;
      if (!grouped.has(type)) {
        grouped.set(type, []);
      }
      grouped.get(type)!.push(item);
    }

    return grouped;
  }

  /**
   * Map itemType to the correct batch content-service path with query parameters.
   *
   * RESOURCE   → /v1/resources/by-ids?ids=id1,id2,id3
   * TUTORIAL   → /v1/tutorials/by-ids?ids=id1,id2,id3
   * RESOURCE_COLLECTION, TUTORIAL_COLLECTION, COLLECTION → /v1/collections/by-ids?ids=id1,id2,id3
   */
  private getBatchContentPath(itemType: string, ids: string[]): string {
    const idQueryParam = ids.join(',');
    switch (itemType) {
      case 'RESOURCE':
        return `/v1/resources/by-ids?ids=${idQueryParam}`;
      case 'TUTORIAL':
        return `/v1/tutorials/by-ids?ids=${idQueryParam}`;
      case 'RESOURCE_COLLECTION':
      case 'TUTORIAL_COLLECTION':
      case 'COLLECTION':
        return `/v1/collections/by-ids?ids=${idQueryParam}`;
      default:
        return `/v1/resources/by-ids?ids=${idQueryParam}`;
    }
  }
}
