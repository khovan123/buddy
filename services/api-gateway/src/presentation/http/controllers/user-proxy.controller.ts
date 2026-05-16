import { JwtAuthGuard } from '@libs/common';
import { successResponse } from '@libs/contracts';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ApiComposerService } from '../../../infrastructure/http/api-composer.service';
import { HttpProxyService } from '../../../infrastructure/http/http-proxy.service';

/** Controller handling incoming requests for UserProxy. */
@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard)
export class UserProxyController {
  constructor(
    private readonly proxy: HttpProxyService,
    private readonly composer: ApiComposerService,
  ) {}

  /**
   * Executes the get users operation.
   *
   * @param req - The req parameter
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @param search - The search parameter
   */
  @Get()
  getUsers(
    @Req() req: FastifyRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const query: Record<string, string> = {};
    if (page) query.page = page;
    if (limit) query.limit = limit;
    if (search) query.search = search;

    return this.proxy.forward(req, {
      service: 'user',
      path: '/v1/users',
      method: 'GET',
      query,
    });
  }

  /**
   * Executes the get me operation.
   *
   * @param req - The req parameter
   */
  @Get('me')
  getMe(@Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'user',
      path: '/v1/users/me',
      method: 'GET',
    });
  }

  /**
   * Executes the update me operation.
   *
   * @param body - The body parameter
   * @param req - The req parameter
   */
  @Patch('me')
  updateMe(@Body() body: unknown, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'user',
      path: '/v1/users/me',
      method: 'PATCH',
      body,
    });
  }

  /**
   * Aggregated creator stats — fans out to user, content, and billing services.
   * Returns { followers, following, avgRating, ratingCount, totalResources, totalSales }.
   *
   * @param id - The creator user ID
   * @param req - The incoming request
   */
  @Get(':id/creator-stats')
  async getCreatorStats(@Param('id') id: string, @Req() req: FastifyRequest) {
    const composed = await this.composer.compose(req, [
      {
        key: 'followCounts',
        options: { service: 'user', path: `/v1/users/${id}/follow-counts`, method: 'GET' },
      },
      {
        key: 'rating',
        options: { service: 'user', path: `/v1/users/${id}/rating/average`, method: 'GET' },
        optional: true,
      },
      {
        key: 'resources',
        options: {
          service: 'content',
          path: '/v1/resources',
          method: 'GET',
          query: { userId: id, limit: '1' },
        },
        optional: true,
      },
      {
        key: 'sales',
        options: { service: 'billing', path: `/v1/billing/sales-count/${id}`, method: 'GET' },
        optional: true,
      },
    ]);

    const extract = (obj: unknown, ...keys: string[]): unknown => {
      let current: unknown = obj;
      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = (current as Record<string, unknown>)[key];
        } else {
          return undefined;
        }
      }
      return current;
    };

    return successResponse({
      followers: extract(composed.followCounts, 'data', 'followers') ?? 0,
      following: extract(composed.followCounts, 'data', 'following') ?? 0,
      avgRating: extract(composed.rating, 'data', 'average') ?? 0,
      ratingCount: extract(composed.rating, 'data', 'count') ?? 0,
      totalResources: extract(composed.resources, 'data', 'meta', 'total') ?? 0,
      totalSales: extract(composed.sales, 'data') ?? 0,
    });
  }

  /**
   * Executes the get by id operation.
   *
   * @param _id - The _id parameter
   * @param req - The req parameter
   */
  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) _id: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'user',
      path: req.url.replace('/v1', ''),
      method: 'GET',
    });
  }
}
