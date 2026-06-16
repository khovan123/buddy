/* eslint-disable @typescript-eslint/no-explicit-any */
import { JwtAuthGuard, Public } from '@libs/common';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { HttpProxyService } from '../../../infrastructure/http/http-proxy.service';

/** Controller handling incoming requests for ResourceProxy. */
@Controller({ path: 'resources', version: '1' })
@UseGuards(JwtAuthGuard)
export class ResourceProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

  /**
   * Executes the create resource operation.
   *
   * @param body - The body parameter
   * @param req - The req parameter
   */
  @Post()
  createResource(@Body() body: unknown, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/resources',
      method: 'POST',
      body,
    });
  }

  /**
   * Executes the get resources operation.
   *
   * @param req - The req parameter
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @param search - The search parameter
   * @param userId - The userId parameter
   */
  @Get()
  @Public()
  getResources(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/resources',
      method: 'GET',
      query,
    });
  }

  /**
   * Executes the get my resources operation.
   *
   * @param req - The req parameter
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @param search - The search parameter
   */
  @Get('me')
  getMyResources(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/resources/me',
      method: 'GET',
      query,
    });
  }

  /**
   * Executes the get resources by user operation.
   *
   * @param req - The req parameter
   * @param userId - The userId parameter
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @param search - The search parameter
   */
  @Get('user/:userId')
  @Public()
  getResourcesByUser(
    @Req() req: FastifyRequest,
    @Param('userId') userId: string,
    @Query() query: any,
  ) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/resources/user/${userId}`,
      method: 'GET',
      query,
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
  @Get('collections')
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
   * Executes the get my resource collections operation.
   *
   * @param req - The req parameter
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @param search - The search parameter
   */
  @Get('collections/me')
  getMyResourceCollections(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/collections/resources/me',
      method: 'GET',
      query,
    });
  }

  /**
   * Executes the get top resources operation.
   *
   * @param req - The req parameter
   * @param limit - The limit parameter
   */
  @Get('top')
  @Public()
  getTopResources(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/resources/top',
      method: 'GET',
      query,
    });
  }

  /**
   * Fetch multiple resources by ID for recommendation hydration.
   */
  @Get('by-ids')
  @Public()
  getResourcesByIds(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/resources/by-ids',
      method: 'GET',
      query,
      timeoutMs: 2_500,
      skipRetry: true,
    });
  }

  /**
   * Executes the get uncollected resources operation.
   *
   * @param req - The req parameter
   * @param courseId - The courseId parameter
   * @param limit - The limit parameter
   */
  @Get('uncollected')
  @Public()
  getUncollectedResources(@Req() req: FastifyRequest, @Query() query: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/resources/uncollected',
      method: 'GET',
      query,
    });
  }

  @Post(':id/moderation/recheck')
  recheckResourceModeration(@Param('id') id: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/resources/${id}/moderation/recheck`,
      method: 'POST',
    });
  }

  @Delete(':id')
  deleteResource(@Param('id') id: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/resources/${id}`,
      method: 'DELETE',
    });
  }

  @Put(':id')
  updateResource(@Param('id') id: string, @Body() body: unknown, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/resources/${id}`,
      method: 'PUT',
      body,
    });
  }

  // @Get(':id')
  // getResourceById(@Param('id') id: string, @Req() req: FastifyRequest) {
  //   return this.proxy.forward(req, {
  //     service: 'content',
  //     path: `/v1/resources/${id}`,
  //     method: 'GET',
  //   });
  // }

  /**
   * Executes the get resource upload history operation for a specific resource item.
   *
   * @param id - The ID of the resource item
   * @param req - The req parameter
   */
  @Get(':id/upload-history')
  getResourceUploadHistory(@Param('id') id: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/resources/${id}/upload-history`,
      method: 'GET',
    });
  }

  /**
   * Executes the get resource by slug operation.
   *
   * @param slug - The slug parameter
   * @param req - The req parameter
   */
  @Get(':slug')
  @Public()
  getResourceBySlug(@Param('slug') slug: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/resources/${slug}`,
      method: 'GET',
    });
  }

  /**
   * Executes the get resource preview operation.
   *
   * @param slug - The slug parameter
   * @param req - The req parameter
   */
  @Get(':slug/preview')
  @Public()
  getResourcePreview(@Param('slug') slug: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/resources/${slug}/preview`,
      method: 'GET',
    });
  }

  /**
   * Executes the get resource collection by slug operation.
   *
   * @param slug - The slug parameter
   * @param req - The req parameter
   */
  @Get('collections/:slug')
  @Public()
  getResourceCollectionBySlug(@Param('slug') slug: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/collections/resources/${slug}`,
      method: 'GET',
    });
  }
}
