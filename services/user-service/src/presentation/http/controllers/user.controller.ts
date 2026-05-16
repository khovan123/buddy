import { JwtAuthGuard, getCorrelationId } from '@libs/common';
import { PaginationDto, successResponse } from '@libs/contracts';
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FastifyRequest } from 'fastify';
import { CreateUserProfileCommand } from '../../../application/commands/create-user-profile.command';
import { UpdateProfileCommand } from '../../../application/commands/update-profile.command';
import { GetUserByIdQuery } from '../../../application/queries/get-user-by-id.query';
import { GetUsersQuery } from '../../../application/queries/get-users.query';
import { UpdateProfileDto } from '../dtos/update-profile.dto';

/** Controller handling incoming requests for User. */
@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Executes the get users operation.
   *
   * @param pagination - The pagination parameter
   * @param search - The search parameter
   */
  @Get()
  async getUsers(@Query() pagination: PaginationDto, @Query('search') search?: string) {
    const result = await this.queryBus.execute(
      new GetUsersQuery(pagination.page, pagination.limit, search, true),
    );
    return successResponse(result, undefined, getCorrelationId());
  }

  /**
   * Executes the get me operation.
   *
   * @param req - The req parameter
   */
  @Get('me')
  async getMe(@Req() req: FastifyRequest & { user: { sub: string; email?: string } }) {
    try {
      const result = await this.queryBus.execute(new GetUserByIdQuery(req.user.sub));
      return successResponse(result, undefined, getCorrelationId());
    } catch (e) {
      if (e instanceof NotFoundException) {
        const dummyEmail = req.user.email || 'unknown@example.com';
        const nickname = req.user.email ? req.user.email.split('@')[0] : 'New User';

        await this.commandBus.execute(
          new CreateUserProfileCommand(req.user.sub, dummyEmail, nickname, getCorrelationId()),
        );

        const retryResult = await this.queryBus.execute(new GetUserByIdQuery(req.user.sub));
        return successResponse(retryResult, undefined, getCorrelationId());
      }
      throw e;
    }
  }

  /**
   * Executes the get by id operation.
   *
   * @param id - The id parameter
   */
  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.queryBus.execute(new GetUserByIdQuery(id));
    return successResponse(result, undefined, getCorrelationId());
  }

  /**
   * Executes the update profile operation.
   *
   * @param req - The req parameter
   * @param dto - The dto parameter
   */
  @Patch('me')
  async updateProfile(
    @Req() req: FastifyRequest & { user: { sub: string; email?: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    const result = await this.commandBus.execute(
      new UpdateProfileCommand(req.user.sub, dto, getCorrelationId(), req.user.email),
    );
    return successResponse(result, 'Profile updated', getCorrelationId());
  }
}
