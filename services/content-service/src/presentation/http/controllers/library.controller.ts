import { getCorrelationId, JwtAuthGuard } from '@libs/common';
import { successResponse } from '@libs/contracts';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { FastifyRequest } from 'fastify';
import { GetLibraryResourceCollectionBySlugQuery } from '../../../application/queries/get-library-resource-collection-by-slug.query';
import { GetLibraryResourceCollectionsQuery } from '../../../application/queries/get-library-resource-collections.query';
import { GetLibraryResourceBySlugQuery } from '../../../application/queries/get-library-resource-by-slug.query';
import { GetLibraryResourcesQuery } from '../../../application/queries/get-library-resources.query';
import { GetLibraryTutorialBySlugQuery } from '../../../application/queries/get-library-tutorial-by-slug.query';
import { GetLibraryTutorialsQuery } from '../../../application/queries/get-library-tutorials.query';
import { GetLibraryTutorialCollectionBySlugQuery } from '../../../application/queries/get-library-tutorial-collection-by-slug.query';
import { GetLibraryTutorialCollectionsQuery } from '../../../application/queries/get-library-tutorial-collections.query';
import { CollectionSlugParamDto } from '../dtos/collection-slug-param.dto';
import { QueryDto } from '../dtos/query';
import { ResourceSlugParamDto } from '../dtos/resource-slug-param.dto';
import { TutorialSlugParamDto } from '../dtos/tutorial-slug-param.dto';

/**
 * LibraryController - User's personal library dashboard.
 *
 * All endpoints are authenticated — returns only data owned by
 * the currently logged-in user (req.user.sub).
 *
 * Covers: Resources, Tutorials, Resource Collections, Tutorial Collections.
 */
@Controller({ path: 'libraries', version: '1' })
@UseGuards(JwtAuthGuard)
export class LibraryController {
  constructor(private readonly queryBus: QueryBus) {}

  // ── Resources (list) ─────────────────────────────────────────

  /**
   * Executes the get my resources operation.
   *
   * @param query - The query parameter
   * @param req - The req parameter
   */
  @Get('resources')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getMyResources(
    @Query() query: QueryDto,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    const { page, limit, search } = query;
    const result = await this.queryBus.execute(
      new GetLibraryResourcesQuery(page, limit, search, req.user.sub),
    );
    return successResponse(result, 'Get library resources successful', getCorrelationId());
  }

  // ── Resource (detail by slug) ────────────────────────────────

  /**
   * Executes the get my resource by slug operation.
   *
   * @param slug - The slug parameter
   */
  @Get('resources/:slug')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getMyResourceBySlug(@Param() params: ResourceSlugParamDto) {
    const result = await this.queryBus.execute(new GetLibraryResourceBySlugQuery(params.slug));
    return successResponse(result, 'Get library resource successful', getCorrelationId());
  }

  // ── Tutorials (list) ─────────────────────────────────────────

  /**
   * Executes the get my tutorials operation.
   *
   * @param query - The query parameter
   * @param req - The req parameter
   */
  @Get('tutorials')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getMyTutorials(
    @Query() query: QueryDto,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    const { page, limit, search } = query;
    const result = await this.queryBus.execute(
      new GetLibraryTutorialsQuery(page, limit, search, req.user.sub),
    );
    return successResponse(result, 'Get library tutorials successful', getCorrelationId());
  }

  // ── Tutorial (detail by slug) ────────────────────────────────

  /**
   * Executes the get my tutorial by slug operation.
   *
   * @param slug - The slug parameter
   */
  @Get('tutorials/:slug')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getMyTutorialBySlug(@Param() params: TutorialSlugParamDto) {
    const result = await this.queryBus.execute(new GetLibraryTutorialBySlugQuery(params.slug));
    return successResponse(result, 'Get library tutorial successful', getCorrelationId());
  }

  // ── Resource Collections (list) ──────────────────────────────

  /**
   * Executes the get my resource collections operation.
   *
   * @param query - The query parameter
   * @param req - The req parameter
   */
  @Get('resources/collections')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getMyResourceCollections(
    @Query() query: QueryDto,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    const { page, limit, search } = query;
    const result = await this.queryBus.execute(
      new GetLibraryResourceCollectionsQuery(page, limit, search, req.user.sub),
    );
    return successResponse(
      result,
      'Get library resource collections successful',
      getCorrelationId(),
    );
  }

  // ── Resource Collection (detail by slug) ─────────────────────

  /**
   * Executes the get my resource collection by slug operation.
   *
   * @param slug - The slug parameter
   */
  @Get('resources/collections/:slug')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getMyResourceCollectionBySlug(@Param() params: CollectionSlugParamDto) {
    const result = await this.queryBus.execute(
      new GetLibraryResourceCollectionBySlugQuery(params.slug),
    );
    return successResponse(
      result,
      'Get library resource collection successful',
      getCorrelationId(),
    );
  }

  // ── Tutorial Collections (list) ──────────────────────────────

  /**
   * Executes the get my tutorial collections operation.
   *
   * @param query - The query parameter
   * @param req - The req parameter
   */
  @Get('tutorials/collections')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getMyTutorialCollections(
    @Query() query: QueryDto,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    const { page, limit, search } = query;
    const result = await this.queryBus.execute(
      new GetLibraryTutorialCollectionsQuery(page, limit, search, req.user.sub),
    );
    return successResponse(
      result,
      'Get library tutorial collections successful',
      getCorrelationId(),
    );
  }

  // ── Tutorial Collection (detail by slug) ─────────────────────

  /**
   * Executes the get my tutorial collection by slug operation.
   *
   * @param slug - The slug parameter
   */
  @Get('tutorials/collections/:slug')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getMyTutorialCollectionBySlug(@Param() params: CollectionSlugParamDto) {
    const result = await this.queryBus.execute(
      new GetLibraryTutorialCollectionBySlugQuery(params.slug),
    );
    return successResponse(
      result,
      'Get library tutorial collection successful',
      getCorrelationId(),
    );
  }
}
