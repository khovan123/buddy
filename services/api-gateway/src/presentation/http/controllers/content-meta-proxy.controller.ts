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

/** Controller handling incoming requests for ContentMetaProxy. */
@Controller({ path: 'content-meta', version: '1' })
export class ContentMetaProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

  /**
   * Executes the get content meta operation.
   *
   * @param req - The req parameter
   */
  @Get()
  @Public()
  getContentMeta(@Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/content-meta',
      method: 'GET',
    });
  }

  /**
   * Executes the get courses by major operation.
   *
   * @param req - The req parameter
   * @param majorId - The majorId parameter
   */
  @Get('courses')
  @Public()
  getCoursesByMajor(@Req() req: FastifyRequest, @Query('majorId') majorId?: string) {
    const query: Record<string, string> = {};
    if (majorId) query.majorId = majorId;

    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/content-meta/courses',
      method: 'GET',
      query,
    });
  }

  // --- MAJOR ADMIN ENDPOINTS ---

  /**
   * Executes the create major operation.
   *
   * @param req - The req parameter
   * @param body - The body parameter
   */
  @Post('majors')
  @UseGuards(JwtAuthGuard)
  createMajor(@Req() req: FastifyRequest, @Body() body: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/content-meta/majors',
      method: 'POST',
      body,
    });
  }

  /**
   * Executes the update major operation.
   *
   * @param id - The id parameter
   * @param req - The req parameter
   * @param body - The body parameter
   */
  @Put('majors/:id')
  @UseGuards(JwtAuthGuard)
  updateMajor(@Param('id') id: string, @Req() req: FastifyRequest, @Body() body: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/content-meta/majors/${id}`,
      method: 'PUT',
      body,
    });
  }

  /**
   * Executes the delete major operation.
   *
   * @param id - The id parameter
   * @param req - The req parameter
   */
  @Delete('majors/:id')
  @UseGuards(JwtAuthGuard)
  deleteMajor(@Param('id') id: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/content-meta/majors/${id}`,
      method: 'DELETE',
    });
  }

  // --- COURSE ADMIN ENDPOINTS ---

  /**
   * Executes the create course operation.
   *
   * @param req - The req parameter
   * @param body - The body parameter
   */
  @Post('courses')
  @UseGuards(JwtAuthGuard)
  createCourse(@Req() req: FastifyRequest, @Body() body: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: '/v1/content-meta/courses',
      method: 'POST',
      body,
    });
  }

  /**
   * Executes the update course operation.
   *
   * @param id - The id parameter
   * @param req - The req parameter
   * @param body - The body parameter
   */
  @Put('courses/:id')
  @UseGuards(JwtAuthGuard)
  updateCourse(@Param('id') id: string, @Req() req: FastifyRequest, @Body() body: any) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/content-meta/courses/${id}`,
      method: 'PUT',
      body,
    });
  }

  /**
   * Executes the delete course operation.
   *
   * @param id - The id parameter
   * @param req - The req parameter
   */
  @Delete('courses/:id')
  @UseGuards(JwtAuthGuard)
  deleteCourse(@Param('id') id: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      path: `/v1/content-meta/courses/${id}`,
      method: 'DELETE',
    });
  }
}
