/* eslint-disable @typescript-eslint/no-explicit-any */
import { JwtAuthGuard, Public } from '@libs/common';
import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { HttpProxyService } from '../../../infrastructure/http/http-proxy.service';

/** Controller handling incoming requests for CollectionProxy. */
@Controller({ path: 'collections', version: '1' })
@UseGuards(JwtAuthGuard)
export class CollectionProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

  /**
   * Executes the create collection operation.
   *
   * @param body - The body parameter
   * @param req - The req parameter
   */
  @Post()
  createCollection(@Body() body: unknown, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/collections',
      method: 'POST',
      body,
    });
  }

  /**
   * Executes the get resource collections operation.
   *
   * @param req - The req parameter
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @param search - The search parameter
   * @param userId - The userId parameter
   */
  @Get('resources')
  @Public()
  getResourceCollections(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/collections/resources',
      method: 'GET',
      query,
    });
  }

  /**
   * Executes the get tutorial collections operation.
   *
   * @param req - The req parameter
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @param search - The search parameter
   * @param userId - The userId parameter
   */
  @Get('tutorials')
  @Public()
  getTutorialCollections(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/collections/tutorials',
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
  @Get('resources/me')
  getMyResourceCollections(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/collections/resources/me',
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
  @Get('tutorials/me')
  getMyTutorialCollections(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/collections/tutorials/me',
      method: 'GET',
      query,
    });
  }

  /**
   * Executes the get top collections operation.
   *
   * @param req - The req parameter
   * @param limit - The limit parameter
   * @param type - The type parameter
   */
  @Get('top')
  @Public()
  getTopCollections(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/collections/top',
      method: 'GET',
      query,
    });
  }

  /**
   * Executes the get resource collection by slug operation.
   *
   * @param slug - The slug parameter
   * @param req - The req parameter
   */
  @Get('resources/:slug')
  @Public()
  getResourceCollectionBySlug(@Param('slug') slug: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/collections/resources/${slug}`,
      method: 'GET',
    });
  }

  /**
   * Executes the get tutorial collection by slug operation.
   *
   * @param slug - The slug parameter
   * @param req - The req parameter
   */
  @Get('tutorials/:slug')
  @Public()
  getTutorialCollectionBySlug(@Param('slug') slug: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/collections/tutorials/${slug}`,
      method: 'GET',
    });
  }
}
