import {
  CreatorOnlyPolicy,
  getCorrelationId,
  JwtAuthGuard,
  PoliciesGuard,
  Public,
  RequirePolicy,
  SubscriptionRequiredPolicy,
} from '@libs/common';
import { successResponse } from '@libs/contracts';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { FastifyRequest } from 'fastify';
import { CreateCollectionCommand } from '../../../application/commands/create-collection.command';
import { UpdateCollectionCommand } from '../../../application/commands/update-collection.command';
import { GetCollectionByIdQuery } from '../../../application/queries/get-collection-by-id.query';
import { GetCollectionsByIdsQuery } from '../../../application/queries/get-collections-by-ids.query';
import { GetMyResourceCollectionsQuery } from '../../../application/queries/get-my-resource-collections.query';
import { GetMyTutorialCollectionsQuery } from '../../../application/queries/get-my-tutorial-collections.query';
import { GetResourceCollectionBySlugQuery } from '../../../application/queries/get-resource-collection-by-slug.query';
import { GetResourceCollectionsQuery } from '../../../application/queries/get-resource-collections.query';
import { GetTopResourceCollectionsQuery } from '../../../application/queries/get-top-resource-collections.query';
import { GetTopTutorialCollectionsQuery } from '../../../application/queries/get-top-tutorial-collections.query';
import { GetTutorialCollectionBySlugQuery } from '../../../application/queries/get-tutorial-collection-by-slug.query';
import { GetTutorialCollectionsQuery } from '../../../application/queries/get-tutorial-collections.query';
import { CollectionLimitPolicy } from '../../../domain/policies/content-limit.policies';
import { CollectionIdParamDto } from '../dtos/collection-id-param.dto';
import { CollectionSlugParamDto } from '../dtos/collection-slug-param.dto';
import { CreateCollectionDto } from '../dtos/create-collection.dto';
import { GetCollectionsByIdsDto } from '../dtos/get-collections-by-ids.dto';
import { GetTopCollectionsQueryDto } from '../dtos/get-top-collections-query.dto';
import { QueryDto } from '../dtos/query';
import { UpdateCollectionDto } from '../dtos/update-collection.dto';

/**
 * CollectionController - HTTP endpoints cho Collection (bộ sưu tập Resource/Tutorial).
 *
 * Workflow:
 * 1. POST /collections - Tạo Collection mới
 * 2. GET /collections - Lấy danh sách Collections
 * 3. GET /collections/:slug - Lấy chi tiết Collection
 */
@Controller({ path: 'collections', version: '1' })
@UseGuards(JwtAuthGuard)
export class CollectionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * POST /v1/collections
   * Tạo Collection mới.
   *
   * Request body:
   * ...
   */
  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PoliciesGuard)
  @RequirePolicy(SubscriptionRequiredPolicy, CreatorOnlyPolicy, CollectionLimitPolicy)
  async createCollection(
    @Body() dto: CreateCollectionDto,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    const {
      title,
      description,
      hightlights,
      majorId,
      courseId,
      resourceIds,
      tutorialIds,
      type,
      discount,
      thumbnailBase64,
    } = dto;

    const result = await this.commandBus.execute(
      new CreateCollectionCommand(
        req.user.sub,
        title,
        description,
        hightlights,
        majorId,
        courseId,
        resourceIds ?? [],
        type,
        discount,
        thumbnailBase64,
        tutorialIds,
        getCorrelationId(),
        dto.phases?.map((p) => ({
          phaseTitle: p.phaseTitle,
          learningGoal: p.learningGoal ?? '',
          items: p.items.map((item) => ({
            itemId: item.itemId,
            itemType: item.itemType,
          })),
        })),
      ),
    );
    return successResponse(result, 'Create collection successful', getCorrelationId());
  }

  /**
   * GET /v1/collections/resources
   */
  @Get('resources')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getResourceCollections(@Query() query: QueryDto) {
    const { page, limit, search, userId, courseId } = query;
    const result = await this.queryBus.execute(
      new GetResourceCollectionsQuery(page, limit, search, userId, courseId),
    );

    return successResponse(result, 'Get resource collections successful', getCorrelationId());
  }

  /**
   * GET /v1/collections/tutorials
   */
  @Get('tutorials')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getTutorialCollections(@Query() query: QueryDto) {
    const { page, limit, search, userId, courseId } = query;
    const result = await this.queryBus.execute(
      new GetTutorialCollectionsQuery(page, limit, search, userId, courseId),
    );

    return successResponse(result, 'Get tutorial collections successful', getCorrelationId());
  }

  /**
   * GET /v1/collections/resources/me
   */
  @Get('resources/me')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getMyResourceCollections(
    @Query() query: QueryDto,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    const { page, limit, search } = query;
    const result = await this.queryBus.execute(
      new GetMyResourceCollectionsQuery(page, limit, search, req.user.sub),
    );
    return successResponse(result, 'Get my resource collections successful', getCorrelationId());
  }

  /**
   * GET /v1/collections/tutorials/me
   */
  @Get('tutorials/me')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getMyTutorialCollections(
    @Query() query: QueryDto,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    const { page, limit, search } = query;
    const result = await this.queryBus.execute(
      new GetMyTutorialCollectionsQuery(page, limit, search, req.user.sub),
    );
    return successResponse(result, 'Get my tutorial collections successful', getCorrelationId());
  }

  /**
   * GET /v1/collections/top?limit=3&type=RESOURCE|TUTORIAL
   * Lấy top K collections theo type.
   */
  @Get('top')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getTopCollections(@Query() query: GetTopCollectionsQueryDto) {
    const isTutorial = query.type?.toUpperCase() === 'TUTORIAL';
    const result = await this.queryBus.execute(
      isTutorial
        ? new GetTopTutorialCollectionsQuery(
            query.limit,
            query.search,
            query.semester,
            query.majorId,
          )
        : new GetTopResourceCollectionsQuery(
            query.limit,
            query.search,
            query.semester,
            query.majorId,
          ),
    );

    return successResponse(result, 'Get top collections successful', getCorrelationId());
  }

  /**
   * GET /v1/collections/by-ids?ids=id1,id2,id3
   * Fetch multiple collections by their IDs.
   * Supports both comma-separated (?ids=id1,id2) and array form (?ids=id1&ids=id2)
   *
   * @param dto - Query parameters containing array of collection IDs
   */
  @Get('by-ids')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getCollectionsByIds(@Query() dto: GetCollectionsByIdsDto) {
    const result = await this.queryBus.execute(new GetCollectionsByIdsQuery(dto.ids));
    return successResponse(result, 'Get collections by ids successful', getCorrelationId());
  }

  @Put(':id')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async updateCollection(
    @Param() params: CollectionIdParamDto,
    @Body() dto: UpdateCollectionDto,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    const correlationId = getCorrelationId();
    const result = await this.commandBus.execute(
      new UpdateCollectionCommand(
        params.id,
        req.user.sub,
        dto.title,
        dto.description,
        dto.hightlights,
        dto.majorId,
        dto.courseId,
        dto.type,
        dto.discount,
        dto.phases?.map((p) => ({
          phaseTitle: p.phaseTitle,
          learningGoal: p.learningGoal ?? '',
          items: p.items.map((item) => ({
            itemId: item.itemId,
            itemType: item.itemType,
          })),
        })),
        dto.thumbnailBase64,
        correlationId,
      ),
    );
    return successResponse(result, 'Collection updated successfully', correlationId);
  }

  /**
   * GET /v1/collections/resources/:slug
   */
  @Get('resources/:slug')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getResourceCollectionBySlug(@Param() params: CollectionSlugParamDto) {
    const result = await this.queryBus.execute(new GetResourceCollectionBySlugQuery(params.slug));
    return successResponse(result, 'Get resource collection successful', getCorrelationId());
  }

  /**
   * GET /v1/collections/tutorials/:slug
   */
  @Get('tutorials/:slug')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getTutorialCollectionBySlug(@Param() params: CollectionSlugParamDto) {
    const result = await this.queryBus.execute(new GetTutorialCollectionBySlugQuery(params.slug));
    return successResponse(result, 'Get tutorial collection successful', getCorrelationId());
  }

  /**
   * GET /v1/collections/:id
   */
  @Get(':id')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getCollectionById(@Param() params: CollectionIdParamDto) {
    const result = await this.queryBus.execute(new GetCollectionByIdQuery(params.id));
    return successResponse(result, 'Get collection successful', getCorrelationId());
  }
}
