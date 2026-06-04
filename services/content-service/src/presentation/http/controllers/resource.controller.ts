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
  Query,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { FastifyRequest } from 'fastify';
import { CreateResourceCommand } from '../../../application/commands/create-resource.command';
import { RecheckResourceModerationCommand } from '../../../application/commands/recheck-resource-moderation.command';
import { GetMyResourcesQuery } from '../../../application/queries/get-my-resources.query';
import { GetResourceByIdQuery } from '../../../application/queries/get-resource-by-id.query';
import { GetResourceBySlugQuery } from '../../../application/queries/get-resource-by-slug.query';
import { GetResourcePreviewQuery } from '../../../application/queries/get-resource-preview.query';
import { GetResourceUploadHistoryQuery } from '../../../application/queries/get-resource-upload-history.query';
import { GetResourcesByIdsQuery } from '../../../application/queries/get-resources-by-ids.query';
import { GetResourcesByUserQuery } from '../../../application/queries/get-resources-by-user.query';
import { GetResourcesQuery } from '../../../application/queries/get-resources.query';
import { GetTopResourcesQuery } from '../../../application/queries/get-top-resources.query';
import { GetUncollectedResourcesQuery } from '../../../application/queries/get-uncollected-resources.query';
import { ResourceLimitPolicy } from '../../../domain/policies/content-limit.policies';
import { CreateResourceDto } from '../dtos/create-resource.dto';
import { GetResourcesByIdsDto } from '../dtos/get-resources-by-ids.dto';
import { GetTopResourcesQueryDto } from '../dtos/get-top-resources-query.dto';
import { GetUncollectedResourcesQueryDto } from '../dtos/get-uncollected-resources-query.dto';
import { QueryDto } from '../dtos/query';
import { ResourceIdParamDto } from '../dtos/resource-id-param.dto';
import { ResourceSlugParamDto } from '../dtos/resource-slug-param.dto';
import { UserIdParamDto } from '../dtos/user-id-param.dto';

/**
 * ResourceController - HTTP endpoints cho Resource (tài liệu/file đính kèm).
 *
 * Workflow:
 * 1. POST /resources - Tạo Resource metadata, lấy presigned URL từ upload-service
 * 2. Client upload trực tiếp lên S3 dùng presigned URL
 * 3. Upload service phát `file.processed` event
 * 4. Content service consume và cập nhật resource
 */
@Controller({ path: 'resources', version: '1' })
@UseGuards(JwtAuthGuard)
export class ResourceController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * POST /v1/resources
   * Tạo Resource metadata và lấy presigned URL cho upload.
   */
  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PoliciesGuard)
  @RequirePolicy(SubscriptionRequiredPolicy, CreatorOnlyPolicy, ResourceLimitPolicy)
  async createResource(
    @Body() dto: CreateResourceDto,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    const {
      collectionId,
      title,
      summary,
      hightlights,
      majorId,
      courseId,
      price,
      files,
      thumbnailBase64,
    } = dto;

    const result = await this.commandBus.execute(
      new CreateResourceCommand(
        req.user.sub,
        title,
        summary,
        hightlights,
        majorId,
        courseId,
        price,
        files,
        thumbnailBase64,
        collectionId,
        getCorrelationId(),
      ),
    );
    return successResponse(result, 'Create resource successful', getCorrelationId());
  }

  /**
   * Executes the get resources operation.
   *
   * @param query - The query parameter
   */
  @Get()
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getResources(@Query() query: QueryDto) {
    const { page, limit, search, userId, semester, majorId } = query;
    const result = await this.queryBus.execute(
      new GetResourcesQuery(page, limit, search, userId, semester, majorId),
    );
    return successResponse(result, 'Get resources successful', getCorrelationId());
  }

  /**
   * Executes the get my resources operation.
   *
   * @param query - The query parameter
   * @param req - The req parameter
   */
  @Get('me')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getMyResources(
    @Query() query: QueryDto,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    const { page, limit, search } = query;
    const result = await this.queryBus.execute(
      new GetMyResourcesQuery(page, limit, search, req.user.sub),
    );
    return successResponse(result, 'Get my resources successful', getCorrelationId());
  }

  /**
   * Executes the get resources by user id operation.
   *
   * @param userId - The userId parameter
   * @param query - The query parameter
   */
  @Get('user/:userId')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getResourcesByUser(@Param() params: UserIdParamDto, @Query() query: QueryDto) {
    const { page, limit, search } = query;
    const result = await this.queryBus.execute(
      new GetResourcesByUserQuery(page, limit, search, params.userId),
    );
    return successResponse(result, 'Get user resources successful', getCorrelationId());
  }

  /**
   * Executes the get top resources operation.
   *
   * @param limit - The limit parameter
   */
  @Get('top')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getTopResources(@Query() query: GetTopResourcesQueryDto) {
    const result = await this.queryBus.execute(
      new GetTopResourcesQuery(query.limit, query.search, query.semester, query.majorId),
    );
    return successResponse(result, 'Get top resources successful', getCorrelationId());
  }

  /**
   * GET /v1/resources/by-ids?ids=id1,id2,id3
   * Fetch multiple resources by their IDs.
   * Supports both comma-separated (?ids=id1,id2) and array form (?ids=id1&ids=id2)
   *
   * @param dto - Query parameters containing array of resource IDs
   */
  @Get('by-ids')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getResourcesByIds(@Query() dto: GetResourcesByIdsDto) {
    const result = await this.queryBus.execute(new GetResourcesByIdsQuery(dto.ids));
    return successResponse(result, 'Get resources by ids successful', getCorrelationId());
  }

  /**
   * GET /v1/resources/uncollected?courseId=xxx&limit=100
   * Returns resources for a course that are NOT assigned to any collection.
   */
  @Get('uncollected')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getUncollectedResources(@Query() query: GetUncollectedResourcesQueryDto) {
    const result = await this.queryBus.execute(
      new GetUncollectedResourcesQuery(query.courseId, query.limit!),
    );
    return successResponse(result, 'Get uncollected resources successful', getCorrelationId());
  }

  /**
   * Executes the get resource upload history operation for a specific resource item.
   *
   * @param id - The ID of the resource item
   */
  @Get(':id/upload-history')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getResourceUploadHistory(@Param() params: ResourceIdParamDto) {
    const result = await this.queryBus.execute(new GetResourceUploadHistoryQuery(params.id));
    return successResponse(result, 'Get resource upload history successful', getCorrelationId());
  }

  @Post(':id/moderation/recheck')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PoliciesGuard)
  @RequirePolicy(SubscriptionRequiredPolicy, CreatorOnlyPolicy)
  async recheckResourceModeration(
    @Param() params: ResourceIdParamDto,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    const correlationId = getCorrelationId();
    const result = await this.commandBus.execute(
      new RecheckResourceModerationCommand(params.id, req.user.sub, correlationId),
    );
    return successResponse(result, 'Resource moderation rechecked', correlationId);
  }

  /**
   * GET /v1/resources/:slug/preview
   * Get a preview URL for a resource document.
   * Free resources return isPreview=false (full access).
   * Paid resources return a 30% preview signed URL.
   */
  @Get(':slug/preview')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getResourcePreview(@Param() params: ResourceSlugParamDto) {
    const result = await this.queryBus.execute(new GetResourcePreviewQuery(params.slug));
    return successResponse(result, 'Get resource preview successful', getCorrelationId());
  }

  @Get(':idOrSlug')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getResource(@Param('idOrSlug') idOrSlug: string) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
    const result = isObjectId
      ? await this.queryBus.execute(new GetResourceByIdQuery(idOrSlug))
      : await this.queryBus.execute(new GetResourceBySlugQuery(idOrSlug));
    return successResponse(result, 'Get resource successful', getCorrelationId());
  }
}
