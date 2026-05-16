import { JwtAuthGuard, Public, getCorrelationId } from '@libs/common';
import { successResponse } from '@libs/contracts';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

// --- Career Imports ---
import { CreateCareerCommand } from '../../../application/commands/create-career.command';
import { DeleteCareerCommand } from '../../../application/commands/delete-career.command';
import { UpdateCareerCommand } from '../../../application/commands/update-career.command';
import { GetCareersQuery } from '../../../application/queries/get-careers.query';
import { CreateCareerDto } from '../dtos/create-career.dto';
import { GetCareersDto } from '../dtos/get-careers.dto';
import { UpdateCareerDto } from '../dtos/update-career.dto';

// --- Skill Imports ---
import { CreateSkillCommand } from '../../../application/commands/create-skill.command';
import { DeleteSkillCommand } from '../../../application/commands/delete-skill.command';
import { UpdateSkillCommand } from '../../../application/commands/update-skill.command';
import { GetSkillsQuery } from '../../../application/queries/get-skills.query';
import { CreateSkillDto } from '../dtos/create-skill.dto';
import { GetSkillsDto } from '../dtos/get-skills.dto';
import { UpdateSkillDto } from '../dtos/update-skill.dto';

// --- Shared ById Query Imports ---
import {
  GetCareerByIdQuery,
  GetSkillByIdQuery,
} from '../../../application/queries/get-by-id.query';

/** Controller handling incoming requests for Careers and Skills. */
@Controller({ path: 'profile-metadata', version: '1' })
@UseGuards(JwtAuthGuard)
export class UserProfileMetadataController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // =========================================================================
  // CAREERS
  // =========================================================================

  @Get('careers')
  @Public()
  async findAllCareers(@Query() query: GetCareersDto) {
    const result = await this.queryBus.execute(
      new GetCareersQuery(query.page, query.limit, query.search),
    );
    return successResponse(result, 'Get careers successful', getCorrelationId());
  }

  @Get('careers/:id')
  @Public()
  async findCareerById(@Param('id') id: string) {
    const result = await this.queryBus.execute(new GetCareerByIdQuery(id));
    return successResponse(result, 'Get career successful', getCorrelationId());
  }

  @Post('careers')
  async createCareer(@Body() dto: CreateCareerDto) {
    const result = await this.commandBus.execute(
      new CreateCareerCommand(dto.name, dto.description),
    );
    return successResponse(result, 'Career created', getCorrelationId());
  }

  @Put('careers/:id')
  async updateCareer(@Param('id') id: string, @Body() dto: UpdateCareerDto) {
    const result = await this.commandBus.execute(
      new UpdateCareerCommand(id, dto.name, dto.description, dto.status as any),
    );
    return successResponse(result, 'Career updated', getCorrelationId());
  }

  @Delete('careers/:id')
  async deleteCareer(@Param('id') id: string) {
    await this.commandBus.execute(new DeleteCareerCommand(id));
    return successResponse(null, 'Career deleted', getCorrelationId());
  }

  // =========================================================================
  // SKILLS
  // =========================================================================

  @Get('skills')
  @Public()
  async findAllSkills(@Query() query: GetSkillsDto) {
    const result = await this.queryBus.execute(
      new GetSkillsQuery(query.page, query.limit, query.careerId),
    );
    return successResponse(result, 'Get skills successful', getCorrelationId());
  }

  @Get('skills/:id')
  @Public()
  async findSkillById(@Param('id') id: string) {
    const result = await this.queryBus.execute(new GetSkillByIdQuery(id));
    return successResponse(result, 'Get skill successful', getCorrelationId());
  }

  @Post('skills')
  async createSkill(@Body() dto: CreateSkillDto) {
    const result = await this.commandBus.execute(new CreateSkillCommand(dto.name, dto.careerId));
    return successResponse(result, 'Skill created', getCorrelationId());
  }

  @Put('skills/:id')
  async updateSkill(@Param('id') id: string, @Body() dto: UpdateSkillDto) {
    const result = await this.commandBus.execute(
      new UpdateSkillCommand(id, dto.name, dto.careerId, dto.status as any),
    );
    return successResponse(result, 'Skill updated', getCorrelationId());
  }

  @Delete('skills/:id')
  async deleteSkill(@Param('id') id: string) {
    await this.commandBus.execute(new DeleteSkillCommand(id));
    return successResponse(null, 'Skill deleted', getCorrelationId());
  }
}
