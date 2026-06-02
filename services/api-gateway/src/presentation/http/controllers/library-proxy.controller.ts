/* eslint-disable @typescript-eslint/no-explicit-any */
import { JwtAuthGuard } from '@libs/common';
import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { HttpProxyService } from '../../../infrastructure/http/http-proxy.service';

/**
 * LibraryProxyController - Proxies authenticated library requests
 * to content-service. All endpoints require JWT authentication.
 */
@Controller({ path: 'libraries', version: '1' })
@UseGuards(JwtAuthGuard)
export class LibraryProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Get('purchased-ids')
  getPurchasedContentIds(@Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/libraries/purchased-ids',
      method: 'GET',
    });
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
  getMyResources(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/libraries/resources',
      method: 'GET',
      query,
    });
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
  getMyResourceCollections(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/libraries/resources/collections',
      method: 'GET',
      query,
    });
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
  getMyTutorials(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/libraries/tutorials',
      method: 'GET',
      query,
    });
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
  getMyTutorialCollections(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/libraries/tutorials/collections',
      method: 'GET',
      query,
    });
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
}
