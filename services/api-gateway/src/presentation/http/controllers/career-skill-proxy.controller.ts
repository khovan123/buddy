import { JwtAuthGuard, Public } from '@libs/common';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { HttpProxyService } from '../../../infrastructure/http/http-proxy.service';

/**
 * Proxies user metadata endpoints to user-service.
 */
@Controller({ path: 'profile-metadata', version: '1' })
@UseGuards(JwtAuthGuard)
export class CareerSkillProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

  // ── Careers ───────────────────────────────────────────────────

  /**
   * Executes the get careers operation.
   *
   * @param req - The req parameter
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @param search - The search parameter
   */
  @Get('careers')
  @Public()
  getCareers(
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
      path: '/v1/profile-metadata/careers',
      method: 'GET',
      query,
    });
  }

  /**
   * Executes the get career by id operation.
   *
   * @param req - The req parameter
   * @param id - The id parameter
   */
  @Get('careers/:id')
  @Public()
  getCareerById(@Req() req: FastifyRequest, @Param('id') id: string) {
    return this.proxy.forward(req, {
      service: 'user',
      path: `/v1/profile-metadata/careers/${id}`,
      method: 'GET',
    });
  }

  /**
   * Executes the create career operation.
   *
   * @param req - The req parameter
   * @param body - The body parameter
   */
  @Post('careers')
  createCareer(@Req() req: FastifyRequest, @Body() body: unknown) {
    return this.proxy.forward(req, {
      service: 'user',
      path: '/v1/profile-metadata/careers',
      method: 'POST',
      body,
    });
  }

  /**
   * Executes the update career operation.
   *
   * @param req - The req parameter
   * @param id - The id parameter
   * @param body - The body parameter
   */
  @Patch('careers/:id')
  updateCareer(@Req() req: FastifyRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.proxy.forward(req, {
      service: 'user',
      path: `/v1/profile-metadata/careers/${id}`,
      method: 'PATCH',
      body,
    });
  }

  /**
   * Executes the delete career operation.
   *
   * @param req - The req parameter
   * @param id - The id parameter
   */
  @Delete('careers/:id')
  deleteCareer(@Req() req: FastifyRequest, @Param('id') id: string) {
    return this.proxy.forward(req, {
      service: 'user',
      path: `/v1/profile-metadata/careers/${id}`,
      method: 'DELETE',
    });
  }

  // ── Skills ────────────────────────────────────────────────────

  /**
   * Executes the get skills operation.
   *
   * @param req - The req parameter
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @param careerId - The careerId parameter
   */
  @Get('skills')
  @Public()
  getSkills(
    @Req() req: FastifyRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('careerId') careerId?: string,
  ) {
    const query: Record<string, string> = {};
    if (page) query.page = page;
    if (limit) query.limit = limit;
    if (careerId) query.careerId = careerId;

    return this.proxy.forward(req, {
      service: 'user',
      path: '/v1/profile-metadata/skills',
      method: 'GET',
      query,
    });
  }

  /**
   * Executes the get skill by id operation.
   *
   * @param req - The req parameter
   * @param id - The id parameter
   */
  @Get('skills/:id')
  @Public()
  getSkillById(@Req() req: FastifyRequest, @Param('id') id: string) {
    return this.proxy.forward(req, {
      service: 'user',
      path: `/v1/profile-metadata/skills/${id}`,
      method: 'GET',
    });
  }

  /**
   * Executes the create skill operation.
   *
   * @param req - The req parameter
   * @param body - The body parameter
   */
  @Post('skills')
  createSkill(@Req() req: FastifyRequest, @Body() body: unknown) {
    return this.proxy.forward(req, {
      service: 'user',
      path: '/v1/profile-metadata/skills',
      method: 'POST',
      body,
    });
  }

  /**
   * Executes the update skill operation.
   *
   * @param req - The req parameter
   * @param id - The id parameter
   * @param body - The body parameter
   */
  @Patch('skills/:id')
  updateSkill(@Req() req: FastifyRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.proxy.forward(req, {
      service: 'user',
      path: `/v1/profile-metadata/skills/${id}`,
      method: 'PATCH',
      body,
    });
  }

  /**
   * Executes the delete skill operation.
   *
   * @param req - The req parameter
   * @param id - The id parameter
   */
  @Delete('skills/:id')
  deleteSkill(@Req() req: FastifyRequest, @Param('id') id: string) {
    return this.proxy.forward(req, {
      service: 'user',
      path: `/v1/profile-metadata/skills/${id}`,
      method: 'DELETE',
    });
  }
}
