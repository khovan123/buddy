import { getCorrelationId, JwtAuthGuard, Public } from '@libs/common';
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
  UseGuards,
  Version,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateCourseCommand } from '../../../application/commands/create-course.command';
import { CreateMajorCommand } from '../../../application/commands/create-major.command';
import { DeleteCourseCommand } from '../../../application/commands/delete-course.command';
import { DeleteMajorCommand } from '../../../application/commands/delete-major.command';
import { UpdateCourseCommand } from '../../../application/commands/update-course.command';
import { UpdateMajorCommand } from '../../../application/commands/update-major.command';
import { GetContentMetaQuery } from '../../../application/queries/get-content-meta.query';
import { GetCoursesByMajorQuery } from '../../../application/queries/get-courses-by-major.query';
import { CreateCourseDto, UpdateCourseDto } from '../dtos/course.dto';
import { CreateMajorDto, UpdateMajorDto } from '../dtos/major.dto';
import { GetCoursesByMajorQueryDto } from '../dtos/get-courses-by-major-query.dto';
import { MajorIdParamDto } from '../dtos/major-id-param.dto';
import { CourseIdParamDto } from '../dtos/course-id-param.dto';

/**
 * ContentMetaController — Management and query of Majors and Courses.
 */
@Controller({ path: 'content-meta', version: '1' })
export class ContentMetaController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Executes the get content meta operation.
   *
   */
  @Get()
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getContentMeta() {
    const result = await this.queryBus.execute(new GetContentMetaQuery());

    return successResponse(result, 'Get content metadata successful', getCorrelationId());
  }

  /**
   * Executes the get courses by major operation.
   *
   * @param majorId - The majorId parameter
   */
  @Get('courses')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getCoursesByMajor(@Query() query: GetCoursesByMajorQueryDto) {
    const courses = await this.queryBus.execute(new GetCoursesByMajorQuery(query.majorId));
    return successResponse(courses, 'Get courses by major successful', getCorrelationId());
  }

  // --- MAJOR ADMIN ENDPOINTS ---

  /**
   * Executes the create major operation.
   *
   * @param dto - The dto parameter
   */
  @Post('majors')
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  async createMajor(@Body() dto: CreateMajorDto) {
    const result = await this.commandBus.execute(new CreateMajorCommand(dto));
    return successResponse(result, 'Create major successful', getCorrelationId());
  }

  /**
   * Executes the update major operation.
   *
   * @param id - The id parameter
   * @param dto - The dto parameter
   */
  @Put('majors/:id')
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async updateMajor(@Param() params: MajorIdParamDto, @Body() dto: UpdateMajorDto) {
    const result = await this.commandBus.execute(new UpdateMajorCommand(params.id, dto));
    return successResponse(result, 'Update major successful', getCorrelationId());
  }

  /**
   * Executes the delete major operation.
   *
   * @param id - The id parameter
   */
  @Delete('majors/:id')
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async deleteMajor(@Param() params: MajorIdParamDto) {
    const result = await this.commandBus.execute(new DeleteMajorCommand(params.id));
    return successResponse({ success: result }, 'Delete major successful', getCorrelationId());
  }

  // --- COURSE ADMIN ENDPOINTS ---

  /**
   * Executes the create course operation.
   *
   * @param dto - The dto parameter
   */
  @Post('courses')
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  async createCourse(@Body() dto: CreateCourseDto) {
    const result = await this.commandBus.execute(new CreateCourseCommand(dto));
    return successResponse(result, 'Create course successful', getCorrelationId());
  }

  /**
   * Executes the update course operation.
   *
   * @param id - The id parameter
   * @param dto - The dto parameter
   */
  @Put('courses/:id')
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async updateCourse(@Param() params: CourseIdParamDto, @Body() dto: UpdateCourseDto) {
    const result = await this.commandBus.execute(new UpdateCourseCommand(params.id, dto));
    return successResponse(result, 'Update course successful', getCorrelationId());
  }

  /**
   * Executes the delete course operation.
   *
   * @param id - The id parameter
   */
  @Delete('courses/:id')
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async deleteCourse(@Param() params: CourseIdParamDto) {
    const result = await this.commandBus.execute(new DeleteCourseCommand(params.id));
    return successResponse({ success: result }, 'Delete course successful', getCorrelationId());
  }
}
