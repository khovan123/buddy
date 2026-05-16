import { JwtAuthGuard, getCorrelationId } from '@libs/common';
import { PaginationDto, successResponse } from '@libs/contracts';
import {
  BadRequestException,
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
import type { IFollowRepository } from '../../../domain/repositories/follow.repository.interface';
import { FOLLOW_REPOSITORY } from '../../../domain/repositories/tokens';

/** Controller handling incoming requests for Follow. */
@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard)
export class FollowController {
  constructor(
    @Inject(FOLLOW_REPOSITORY)
    private readonly repo: IFollowRepository,
  ) {}

  /**
   * Executes the follow operation.
   *
   * @param targetId - The targetId parameter
   * @param req - The req parameter
   */
  @Post(':id/follow')
  async follow(
    @Param('id') targetId: string,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    if (req.user.sub === targetId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    await this.repo.follow(req.user.sub, targetId);
    return successResponse(null, 'Followed successfully', getCorrelationId());
  }

  /**
   * Executes the unfollow operation.
   *
   * @param targetId - The targetId parameter
   * @param req - The req parameter
   */
  @Delete(':id/follow')
  async unfollow(
    @Param('id') targetId: string,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    await this.repo.unfollow(req.user.sub, targetId);
    return successResponse(null, 'Unfollowed successfully', getCorrelationId());
  }

  /**
   * Executes the get followers operation.
   *
   * @param userId - The userId parameter
   * @param pagination - The pagination parameter
   */
  @Get(':id/followers')
  async getFollowers(@Param('id') userId: string, @Query() pagination: PaginationDto) {
    const result = await this.repo.getFollowers(userId, pagination.page, pagination.limit);
    return successResponse(result, undefined, getCorrelationId());
  }

  /**
   * Executes the get following operation.
   *
   * @param userId - The userId parameter
   * @param pagination - The pagination parameter
   */
  @Get(':id/following')
  async getFollowing(@Param('id') userId: string, @Query() pagination: PaginationDto) {
    const result = await this.repo.getFollowing(userId, pagination.page, pagination.limit);
    return successResponse(result, undefined, getCorrelationId());
  }

  /**
   * Executes the is following operation.
   *
   * @param targetId - The targetId parameter
   * @param req - The req parameter
   */
  @Get(':id/is-following')
  async isFollowing(
    @Param('id') targetId: string,
    @Req() req: FastifyRequest & { user: { sub: string } },
  ) {
    const result = await this.repo.isFollowing(req.user.sub, targetId);
    return successResponse({ isFollowing: result }, undefined, getCorrelationId());
  }

  /**
   * Executes the get follow counts operation.
   *
   * @param userId - The userId parameter
   */
  @Get(':id/follow-counts')
  async getFollowCounts(@Param('id') userId: string) {
    const [followers, following] = await Promise.all([
      this.repo.getFollowerCount(userId),
      this.repo.getFollowingCount(userId),
    ]);
    return successResponse({ followers, following }, undefined, getCorrelationId());
  }
}
