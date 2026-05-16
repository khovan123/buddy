import { paginate, PaginatedResult, PaginationDto } from '@libs/contracts';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Follow } from '../../../../domain/entities/follow.entity';
import type { IFollowRepository } from '../../../../domain/repositories/follow.repository.interface';
import type { FollowDocument } from '../schemas/follow.schema';

/** Repository interface/implementation for  follow mongo data access. */
@Injectable()
export class FollowMongoRepository implements IFollowRepository {
  constructor(
    @InjectModel('Follow')
    private readonly model: Model<FollowDocument>,
  ) {}

  /**
   * Executes the follow operation.
   *
   * @param followerId - The followerId parameter
   * @param followingId - The followingId parameter
   */
  async follow(followerId: string, followingId: string): Promise<void> {
    // Idempotent upsert — if already following, do nothing
    await this.model.updateOne(
      { followerId, followingId },
      { $setOnInsert: { followerId, followingId } },
      { upsert: true },
    );
  }

  /**
   * Executes the unfollow operation.
   *
   * @param followerId - The followerId parameter
   * @param followingId - The followingId parameter
   */
  async unfollow(followerId: string, followingId: string): Promise<void> {
    await this.model.deleteOne({ followerId, followingId });
  }

  /**
   * Executes the is following operation.
   *
   * @param followerId - The followerId parameter
   * @param followingId - The followingId parameter
   * @returns Result of type Promise<boolean>
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    return !!(await this.model.exists({ followerId, followingId }));
  }

  /**
   * Executes the get followers operation.
   *
   * @param userId - The userId parameter
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @returns Result of type Promise<PaginatedResult<FollowEntity>>
   */
  async getFollowers(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Follow>> {
    const query = { followingId: userId };
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      this.model.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.model.countDocuments(query).exec(),
    ]);

    const dto = new PaginationDto();
    dto.page = page;
    dto.limit = limit;
    return paginate(
      docs.map((d) => this.toEntity(d)),
      total,
      dto,
    );
  }

  /**
   * Executes the get following operation.
   *
   * @param userId - The userId parameter
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @returns Result of type Promise<PaginatedResult<FollowEntity>>
   */
  async getFollowing(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Follow>> {
    const query = { followerId: userId };
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      this.model.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.model.countDocuments(query).exec(),
    ]);

    const dto = new PaginationDto();
    dto.page = page;
    dto.limit = limit;
    return paginate(
      docs.map((d) => this.toEntity(d)),
      total,
      dto,
    );
  }

  /**
   * Executes the get follower count operation.
   *
   * @param userId - The userId parameter
   * @returns Result of type Promise<number>
   */
  async getFollowerCount(userId: string): Promise<number> {
    return this.model.countDocuments({ followingId: userId }).exec();
  }

  /**
   * Executes the get following count operation.
   *
   * @param userId - The userId parameter
   * @returns Result of type Promise<number>
   */
  async getFollowingCount(userId: string): Promise<number> {
    return this.model.countDocuments({ followerId: userId }).exec();
  }

  /**
   * Executes the to entity operation.
   *
   * @param doc - The doc parameter
   * @returns Result of type FollowEntity
   */
  private toEntity(doc: FollowDocument): Follow {
    return Follow.reconstitute({
      followerId: doc.followerId,
      followingId: doc.followingId,
      createdAt: doc.createdAt,
    });
  }
}
