/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCorrelationId, JwtAuthGuard } from '@libs/common';
import { successResponse } from '@libs/contracts';
import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { HttpProxyService } from '../../../infrastructure/http/http-proxy.service';

type ApiResponse<T> = {
  data?: T;
};

type AccessItem = {
  resourceId: string;
  resourceType: 'RESOURCE' | 'COLLECTION' | 'TUTORIAL';
  purchaseId?: string | null;
  grantedAt?: string;
};

type LibraryItem = {
  id?: string;
  _id?: string;
  title?: string;
  slug?: string;
  summary?: string;
  description?: string;
  hightlights?: string[];
  type?: string;
};

type PaginatedResult<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

/**
 * LibraryProxyController - Proxies authenticated library requests
 * through the gateway. Library list endpoints use content-access-service
 * as the ownership source of truth, then hydrate content via content-service.
 */
@Controller({ path: 'libraries', version: '1' })
@UseGuards(JwtAuthGuard)
export class LibraryProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Get('purchased-ids')
  async getPurchasedContentIds(@Req() req: FastifyRequest) {
    const access = await this.getAccessItems(req);
    const ids = [...new Set(access.map((item) => item.resourceId))];
    return successResponse(ids, 'Get purchased content ids successful', getCorrelationId());
  }

  // ── Resources ────────────────────────────────────────────────

  /**
   * Executes the get my resources operation.
   *
   * @param req - The req parameter
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @param search - The search parameter
   */
  @Get('resources')
  async getMyResources(@Req() req: FastifyRequest, @Query() query: any) {
    const result = await this.getPurchasedContentPage(
      req,
      query,
      'RESOURCE',
      '/v1/resources/by-ids',
    );
    return successResponse(result, 'Get library resources successful', getCorrelationId());
  }

  /**
   * Executes the get my resource collections operation.
   *
   * @param req - The req parameter
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @param search - The search parameter
   */
  @Get('resources/collections')
  async getMyResourceCollections(@Req() req: FastifyRequest, @Query() query: any) {
    const result = await this.getPurchasedCollectionPage(req, query, 'RESOURCE');
    return successResponse(
      result,
      'Get library resource collections successful',
      getCorrelationId(),
    );
  }

  /**
   * Executes the get my resource collection by slug operation.
   *
   * @param slug - The slug parameter
   * @param req - The req parameter
   */
  @Get('resources/collections/:slug')
  getMyResourceCollectionBySlug(@Param('slug') slug: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/libraries/resources/collections/${slug}`,
      method: 'GET',
    });
  }

  /**
   * Executes the get my resource by slug operation.
   *
   * @param slug - The slug parameter
   * @param req - The req parameter
   */
  @Get('resources/:slug')
  getMyResourceBySlug(@Param('slug') slug: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/libraries/resources/${slug}`,
      method: 'GET',
    });
  }

  // ── Tutorials ────────────────────────────────────────────────

  /**
   * Executes the get my tutorials operation.
   *
   * @param req - The req parameter
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @param search - The search parameter
   */
  @Get('tutorials')
  async getMyTutorials(@Req() req: FastifyRequest, @Query() query: any) {
    const result = await this.getPurchasedContentPage(
      req,
      query,
      'TUTORIAL',
      '/v1/tutorials/by-ids',
    );
    return successResponse(result, 'Get library tutorials successful', getCorrelationId());
  }

  /**
   * Executes the get my tutorial collections operation.
   *
   * @param req - The req parameter
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @param search - The search parameter
   */
  @Get('tutorials/collections')
  async getMyTutorialCollections(@Req() req: FastifyRequest, @Query() query: any) {
    const result = await this.getPurchasedCollectionPage(req, query, 'TUTORIAL');
    return successResponse(
      result,
      'Get library tutorial collections successful',
      getCorrelationId(),
    );
  }

  /**
   * Executes the get my tutorial collection by slug operation.
   *
   * @param slug - The slug parameter
   * @param req - The req parameter
   */
  @Get('tutorials/collections/:slug')
  getMyTutorialCollectionBySlug(@Param('slug') slug: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/libraries/tutorials/collections/${slug}`,
      method: 'GET',
    });
  }

  /**
   * Executes the get my tutorial by slug operation.
   *
   * @param slug - The slug parameter
   * @param req - The req parameter
   */
  @Get('tutorials/:slug')
  getMyTutorialBySlug(@Param('slug') slug: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/libraries/tutorials/${slug}`,
      method: 'GET',
    });
  }

  private async getAccessItems(req: FastifyRequest): Promise<AccessItem[]> {
    const response = await this.proxy.forward(req, {
      service: 'content-access',
      path: '/v1/access/me',
      method: 'GET',
      timeoutMs: 2_500,
      skipRetry: true,
    });

    return this.extractData<AccessItem[]>(response, []);
  }

  private async getPurchasedContentPage(
    req: FastifyRequest,
    query: Record<string, unknown>,
    resourceType: 'RESOURCE' | 'TUTORIAL',
    contentPath: string,
  ): Promise<PaginatedResult<LibraryItem>> {
    const access = await this.getAccessItems(req);
    const ids = this.idsForType(access, resourceType);

    if (ids.length === 0) {
      return this.emptyPage(query);
    }

    const items = await this.fetchContentByIds(req, contentPath, ids);
    return this.toPurchasedPage(items, ids, query);
  }

  private async getPurchasedCollectionPage(
    req: FastifyRequest,
    query: Record<string, unknown>,
    collectionType: 'RESOURCE' | 'TUTORIAL',
  ): Promise<PaginatedResult<LibraryItem>> {
    const access = await this.getAccessItems(req);
    const ids = this.idsForType(access, 'COLLECTION');

    if (ids.length === 0) {
      return this.emptyPage(query);
    }

    const items = await this.fetchContentByIds(req, '/v1/collections/by-ids', ids);
    const matchingCollections = items.filter((item) => item.type === collectionType);
    return this.toPurchasedPage(matchingCollections, ids, query);
  }

  private async fetchContentByIds(
    req: FastifyRequest,
    path: string,
    ids: string[],
  ): Promise<LibraryItem[]> {
    const response = await this.proxy.forward(req, {
      service: 'content',
      path,
      method: 'GET',
      query: { ids: ids.join(',') },
      timeoutMs: 5_000,
      skipRetry: true,
    });

    return this.extractData<LibraryItem[]>(response, []);
  }

  private idsForType(access: AccessItem[], resourceType: AccessItem['resourceType']): string[] {
    const seen = new Set<string>();
    const ids: string[] = [];

    for (const item of access) {
      if (item.resourceType !== resourceType || seen.has(item.resourceId)) {
        continue;
      }
      seen.add(item.resourceId);
      ids.push(item.resourceId);
    }

    return ids;
  }

  private toPurchasedPage<T extends LibraryItem>(
    items: T[],
    orderedIds: string[],
    query: Record<string, unknown>,
  ): PaginatedResult<T> {
    const { page, limit, search } = this.parseListQuery(query);
    const order = new Map(orderedIds.map((id, index) => [id, index]));
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = items
      .filter((item) => {
        if (!normalizedSearch) return true;
        const haystack = [
          item.title,
          item.slug,
          item.summary,
          item.description,
          ...(item.hightlights ?? []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      })
      .sort((a, b) => {
        const aId = String(a.id ?? a._id ?? '');
        const bId = String(b.id ?? b._id ?? '');
        return (
          (order.get(aId) ?? Number.MAX_SAFE_INTEGER) - (order.get(bId) ?? Number.MAX_SAFE_INTEGER)
        );
      });

    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    return {
      data,
      meta: {
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  }

  private emptyPage<T>(query: Record<string, unknown>): PaginatedResult<T> {
    const { page, limit } = this.parseListQuery(query);
    return {
      data: [],
      meta: {
        total: 0,
        page,
        limit,
        totalPages: 0,
      },
    };
  }

  private parseListQuery(query: Record<string, unknown>) {
    const page = this.toPositiveInt(query.page, 1);
    const limit = this.toPositiveInt(query.limit, 20);
    const search = typeof query.search === 'string' ? query.search : '';
    return { page, limit, search };
  }

  private toPositiveInt(value: unknown, fallback: number) {
    const raw = Array.isArray(value) ? value[0] : value;
    const parsed = Number.parseInt(String(raw ?? ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private extractData<T>(response: unknown, fallback: T): T {
    if (!response || typeof response !== 'object') {
      return fallback;
    }

    const data = (response as ApiResponse<T>).data;
    return data === undefined ? fallback : data;
  }
}
