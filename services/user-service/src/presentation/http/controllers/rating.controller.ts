import { JwtAuthGuard, getCorrelationId } from '@libs/common';
import { PaginationDto, successResponse } from '@libs/contracts';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { USER_RATING_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IUserRatingRepository } from '../../../domain/repositories/user-rating.repository.interface';
import { RateUserDto } from '../dtos/rate-user.dto';

/** Controller handling incoming requests for Rating. */
@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard)
export class RatingController {
  constructor(
    @Inject(USER_RATING_REPOSITORY)
    private readonly repo: IUserRatingRepository,
  ) {}

  /**
   * Executes the rate user operation.
   *
   * @param targetId - The targetId parameter
   * @param dto - The dto parameter
   * @param req - The req parameter
   */
  @Post(':id/rating')
  async rateUser(
    @Param('id') targetId: string,
    @Body() dto: RateUserDto,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    if (req.user.sub === targetId) {
      throw new BadRequestException('Cannot rate yourself');
    }

    const result = await this.repo.rate(req.user.sub, targetId, dto.score, dto.comment);
    return successResponse(result, 'Rating submitted', getCorrelationId());
  }

  /**
   * Executes the delete rating operation.
   *
   * @param targetId - The targetId parameter
   * @param req - The req parameter
   */
  @Delete(':id/rating')
  async deleteRating(
    @Param('id') targetId: string,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    await this.repo.deleteRating(req.user.sub, targetId);
    return successResponse(null, 'Rating removed', getCorrelationId());
  }

  /**
   * Executes the get ratings operation.
   *
   * @param targetId - The targetId parameter
   * @param pagination - The pagination parameter
   */
  @Get(':id/ratings')
  async getRatings(@Param('id') targetId: string, @Query() pagination: PaginationDto) {
    const result = await this.repo.getRatingsForUser(targetId, pagination.page, pagination.limit);
    return successResponse(result, undefined, getCorrelationId());
  }

  /**
   * Executes the get average rating operation.
   *
   * @param targetId - The targetId parameter
   */
  @Get(':id/rating/average')
  async getAverageRating(@Param('id') targetId: string) {
    const result = await this.repo.getAverageRating(targetId);
    return successResponse(result, undefined, getCorrelationId());
  }

  /**
   * Executes the get my rating operation.
   *
   * @param targetId - The targetId parameter
   * @param req - The req parameter
   */
  @Get(':id/rating/mine')
  async getMyRating(
    @Param('id') targetId: string,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    const result = await this.repo.getUserRating(req.user.sub, targetId);
    return successResponse(result, undefined, getCorrelationId());
  }
}
