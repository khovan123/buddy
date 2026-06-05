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
  Delete,
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
import { CreateTutorialCommand } from '../../../application/commands/create-tutorial.command';
import { DeleteTutorialCommand } from '../../../application/commands/delete-tutorial.command';
import { RecheckTutorialModerationCommand } from '../../../application/commands/recheck-tutorial-moderation.command';
import { UpdateTutorialCommand } from '../../../application/commands/update-tutorial.command';
import { GetMyTutorialsQuery } from '../../../application/queries/get-my-tutorials.query';
import { GetTopTutorialsQuery } from '../../../application/queries/get-top-tutorials.query';
import { GetTutorialByIdQuery } from '../../../application/queries/get-tutorial-by-id.query';
import { GetTutorialBySlugQuery } from '../../../application/queries/get-tutorial-by-slug.query';
import { GetTutorialUploadHistoryQuery } from '../../../application/queries/get-tutorial-upload-history.query';
import { GetTutorialsByIdsQuery } from '../../../application/queries/get-tutorials-by-ids.query';
import { GetTutorialsByUserQuery } from '../../../application/queries/get-tutorials-by-user.query';
import { GetTutorialsQuery } from '../../../application/queries/get-tutorials.query';
import { GetUncollectedTutorialsQuery } from '../../../application/queries/get-uncollected-tutorials.query';
import { TutorialLimitPolicy } from '../../../domain/policies/content-limit.policies';
import { CreateTutorialDto } from '../dtos/create-tutorial.dto';
import { GetTopTutorialsQueryDto } from '../dtos/get-top-tutorials-query.dto';
import { GetTutorialsByIdsDto } from '../dtos/get-tutorials-by-ids.dto';
import { GetUncollectedTutorialsQueryDto } from '../dtos/get-uncollected-tutorials-query.dto';
import { QueryDto } from '../dtos/query';
import { TutorialIdParamDto } from '../dtos/tutorial-id-param.dto';
import { UpdateTutorialDto } from '../dtos/update-tutorial.dto';
import { UserIdParamDto } from '../dtos/user-id-param.dto';

/**
 * TutorialController - HTTP endpoints cho Tutorial (video-based course).
 *
 * Workflow (New - Presigned URL):
 * 1. POST /tutorials - Tạo Tutorial metadata, lấy presigned URL từ upload-service
 * 2. Client upload trực tiếp lên S3 dùng presigned URL
 * 3. Upload service xử lý video (HLS transcode, trailer cut)
 * 4. Upload service phát `file.processed` event
 * 5. Content service consume và cập nhật tutorial
 */
@Controller({ path: 'tutorials', version: '1' })
@UseGuards(JwtAuthGuard)
export class TutorialController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * POST /v1/tutorials
   * Tạo Tutorial metadata và lấy presigned URL cho upload video.
   */
  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PoliciesGuard)
  @RequirePolicy(SubscriptionRequiredPolicy, CreatorOnlyPolicy, TutorialLimitPolicy)
  async createTutorial(
    @Body() dto: CreateTutorialDto,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    const {
      title,
      description,
      hightlights,
      majorId,
      courseId,
      price,
      discountBundle,
      fileName,
      fileSizeBytes,
      videoDurationSeconds,
      collectionId,
      resourceIds,
      collectionIds,
      steps,
    } = dto;

    const result = await this.commandBus.execute(
      new CreateTutorialCommand(
        req.user.sub,
        title,
        description,
        hightlights,
        majorId,
        courseId,
        price,
        discountBundle,
        fileName,
        fileSizeBytes,
        videoDurationSeconds,
        resourceIds,
        collectionId,
        collectionIds,
        steps?.map((s) => ({
          title: s.title,
          resources: s.resources.map((r) => ({
            resourceId: r.resourceId,
            instructionNote: r.instructionNote ?? '',
          })),
        })),
        getCorrelationId(),
      ),
    );
    return successResponse(result, 'Create tutorial successful', getCorrelationId());
  }

  /**
   * Executes the get tutorials operation.
   *
   * @param query - The query parameter
   */
  @Get()
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getTutorials(@Query() query: QueryDto) {
    const { page, limit, search, userId, semester, majorId } = query;
    const result = await this.queryBus.execute(
      new GetTutorialsQuery(page, limit, search, userId, semester, majorId),
    );
    return successResponse(result, 'Get tutorials successful', getCorrelationId());
  }

  /**
   * Executes the get my tutorials operation.
   *
   * @param query - The query parameter
   * @param req - The req parameter
   */
  @Get('me')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getMyTutorials(
    @Query() query: QueryDto,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    const { page, limit, search } = query;
    const result = await this.queryBus.execute(
      new GetMyTutorialsQuery(page, limit, search, req.user.sub),
    );
    return successResponse(result, 'Get my tutorials successful', getCorrelationId());
  }

  /**
   * Executes the get tutorials by user id operation.
   *
   * @param userId - The userId parameter
   * @param query - The query parameter
   */
  @Get('user/:userId')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getTutorialsByUser(@Param() params: UserIdParamDto, @Query() query: QueryDto) {
    const { page, limit, search } = query;
    const result = await this.queryBus.execute(
      new GetTutorialsByUserQuery(page, limit, search, params.userId),
    );
    return successResponse(result, 'Get user tutorials successful', getCorrelationId());
  }

  /**
   * Executes the get top tutorials operation.
   *
   * @param limit - The limit parameter
   */
  @Get('top')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getTopTutorials(@Query() query: GetTopTutorialsQueryDto) {
    const result = await this.queryBus.execute(
      new GetTopTutorialsQuery(query.limit, query.search, query.semester, query.majorId),
    );
    return successResponse(result, 'Get top tutorials successful', getCorrelationId());
  }
  /**
   * GET /v1/tutorials/by-ids?ids=id1,id2,id3
   * Fetch multiple tutorials by their IDs.
   * Supports both comma-separated (?ids=id1,id2) and array form (?ids=id1&ids=id2)
   *
   * @param dto - Query parameters containing array of tutorial IDs
   */
  @Get('by-ids')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getTutorialsByIds(@Query() dto: GetTutorialsByIdsDto) {
    const result = await this.queryBus.execute(new GetTutorialsByIdsQuery(dto.ids));
    return successResponse(result, 'Get tutorials by ids successful', getCorrelationId());
  }
  /**
   * GET /v1/tutorials/uncollected?courseId=xxx&limit=100
   * Returns tutorials for a course that are NOT assigned to any collection.
   */
  @Get('uncollected')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getUncollectedTutorials(@Query() query: GetUncollectedTutorialsQueryDto) {
    const result = await this.queryBus.execute(
      new GetUncollectedTutorialsQuery(query.courseId, query.limit!),
    );
    return successResponse(result, 'Get uncollected tutorials successful', getCorrelationId());
  }

  /**
   * Executes the get tutorial upload history operation for a specific tutorial item.
   *
   * @param id - The ID of the tutorial item
   */
  @Get(':id/upload-history')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getTutorialUploadHistory(@Param() params: TutorialIdParamDto) {
    const result = await this.queryBus.execute(new GetTutorialUploadHistoryQuery(params.id));
    return successResponse(result, 'Get tutorial upload history successful', getCorrelationId());
  }

  @Post(':id/moderation/recheck')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PoliciesGuard)
  @RequirePolicy(SubscriptionRequiredPolicy, CreatorOnlyPolicy)
  async recheckTutorialModeration(
    @Param() params: TutorialIdParamDto,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    const correlationId = getCorrelationId();
    const result = await this.commandBus.execute(
      new RecheckTutorialModerationCommand(params.id, req.user.sub, correlationId),
    );
    return successResponse(result, 'Tutorial moderation rechecked', correlationId);
  }

  @Put(':id')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async updateTutorial(
    @Param() params: TutorialIdParamDto,
    @Body() dto: UpdateTutorialDto,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    const correlationId = getCorrelationId();
    const result = await this.commandBus.execute(
      new UpdateTutorialCommand(
        params.id,
        req.user.sub,
        dto.title,
        dto.description,
        dto.hightlights,
        dto.majorId,
        dto.courseId,
        dto.price,
        dto.discountBundle,
        dto.collectionId,
        dto.steps?.map((s) => ({
          title: s.title,
          resources: s.resources.map((r) => ({
            resourceId: r.resourceId,
            instructionNote: r.instructionNote ?? '',
          })),
        })),
        correlationId,
      ),
    );
    return successResponse(result, 'Tutorial updated successfully', correlationId);
  }

  @Delete(':id')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async deleteTutorial(
    @Param() params: TutorialIdParamDto,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    const correlationId = getCorrelationId();
    const result = await this.commandBus.execute(
      new DeleteTutorialCommand(params.id, req.user.sub),
    );
    return successResponse(result, 'Tutorial deleted successfully', correlationId);
  }

  @Get(':idOrSlug')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getTutorial(@Param('idOrSlug') idOrSlug: string) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
    const result = isObjectId
      ? await this.queryBus.execute(new GetTutorialByIdQuery(idOrSlug))
      : await this.queryBus.execute(new GetTutorialBySlugQuery(idOrSlug));
    return successResponse(result, 'Get tutorial successful', getCorrelationId());
  }
}
