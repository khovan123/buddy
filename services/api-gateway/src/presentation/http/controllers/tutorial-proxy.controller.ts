/* eslint-disable @typescript-eslint/no-explicit-any */
import { JwtAuthGuard, Public } from '@libs/common';
import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { HttpProxyService } from '../../../infrastructure/http/http-proxy.service';

/** Controller handling incoming requests for TutorialProxy. */
@Controller({ path: 'tutorials', version: '1' })
@UseGuards(JwtAuthGuard)
export class TutorialProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

  /**
   * Executes the create tutorial operation.
   *
   * @param body - The body parameter
   * @param req - The req parameter
   */
  @Post()
  createTutorial(@Body() body: unknown, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/tutorials',
      method: 'POST',
      body,
    });
  }

  /**
   * Executes the get tutorials operation.
   *
   * @param req - The req parameter
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @param search - The search parameter
   * @param userId - The userId parameter
   */
  @Get()
  @Public()
  getTutorials(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/tutorials',
      method: 'GET',
      query,
    });
  }

  /**
   * Executes the get my tutorials operation.
   *
   * @param req - The req parameter
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @param search - The search parameter
   */
  @Get('me')
  getMyTutorials(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/tutorials/me',
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
  @Get('collections')
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
   * Executes the get my tutorial collections operation.
   *
   * @param req - The req parameter
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @param search - The search parameter
   */
  @Get('collections/me')
  getMyTutorialCollections(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/collections/tutorials/me',
      method: 'GET',
      query,
    });
  }

  /**
   * Executes the get top tutorials operation.
   *
   * @param req - The req parameter
   * @param limit - The limit parameter
   */
  @Get('top')
  @Public()
  getTopTutorials(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/tutorials/top',
      method: 'GET',
      query,
    });
  }

  /**
   * Fetch multiple tutorials by ID for recommendation hydration.
   */
  @Get('by-ids')
  @Public()
  getTutorialsByIds(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/tutorials/by-ids',
      method: 'GET',
      query,
      timeoutMs: 2_500,
      skipRetry: true,
    });
  }

  /**
   * Executes the get uncollected tutorials operation.
   *
   * @param req - The req parameter
   * @param courseId - The courseId parameter
   * @param limit - The limit parameter
   */
  @Get('uncollected')
  @Public()
  getUncollectedTutorials(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/tutorials/uncollected',
      method: 'GET',
      query,
    });
  }

  // @Get(':id')
  // getTutorialById(@Param('id') id: string, @Req() req: FastifyRequest) {
  //   return this.proxy.forward(req, {
  //     service: 'content',
  //     path: `/v1/tutorials/${id}`,
  //     method: 'GET',
  //   });
  // }

  /**
   * Executes the get tutorial upload history operation for a specific tutorial item.
   *
   * @param id - The ID of the tutorial item
   * @param req - The req parameter
   */
  @Get(':id/upload-history')
  getTutorialUploadHistory(@Param('id') id: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/tutorials/${id}/upload-history`,
      method: 'GET',
    });
  }

  /**
   * Executes the get tutorial by slug operation.
   *
   * @param slug - The slug parameter
   * @param req - The req parameter
   */
  @Get(':slug')
  @Public()
  getTutorialBySlug(@Param('slug') slug: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/tutorials/${slug}`,
      method: 'GET',
    });
  }

  /**
   * Executes the get tutorial collection by slug operation.
   *
   * @param slug - The slug parameter
   * @param req - The req parameter
   */
  @Get('collections/:slug')
  @Public()
  getTutorialCollectionBySlug(@Param('slug') slug: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/collections/tutorials/${slug}`,
      method: 'GET',
    });
  }
}
