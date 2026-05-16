import { paginate, PaginatedResult, PaginationDto } from '@libs/contracts';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AverageRating, UserRating } from '../../../../domain/entities/user-rating.entity';
import type { IUserRatingRepository } from '../../../../domain/repositories/user-rating.repository.interface';
import type { UserRatingDocument } from '../schemas/user-rating.schema';

/** Repository interface/implementation for  user rating mongo data access. */
@Injectable()
export class UserRatingMongoRepository implements IUserRatingRepository {
  constructor(
    @InjectModel('UserRating')
    private readonly model: Model<UserRatingDocument>,
  ) {}

  /**
   * Executes the rate operation.
   *
   * @param raterId - The raterId parameter
   * @param targetId - The targetId parameter
   * @param score - The score parameter
   * @param comment - The comment parameter
   * @returns Result of type Promise<UserRatingEntity>
   */
  async rate(
    raterId: string,
    targetId: string,
    score: number,
    comment?: string,
  ): Promise<UserRating> {
    const doc = await this.model.findOneAndUpdate(
      { raterId, targetId },
      { raterId, targetId, score, comment },
      { upsert: true, new: true },
    );
    return this.toEntity(doc);
  }

  /**
   * Executes the delete rating operation.
   *
   * @param raterId - The raterId parameter
   * @param targetId - The targetId parameter
   */
  async deleteRating(raterId: string, targetId: string): Promise<void> {
    await this.model.deleteOne({ raterId, targetId });
  }

  /**
   * Executes the get ratings for user operation.
   *
   * @param targetId - The targetId parameter
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @returns Result of type Promise<PaginatedResult<UserRatingEntity>>
   */
  async getRatingsForUser(
    targetId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<UserRating>> {
    const query = { targetId };
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
   * Executes the get average rating operation.
   *
   * @param targetId - The targetId parameter
   * @returns Result of type Promise<AverageRating>
   */
  async getAverageRating(targetId: string): Promise<AverageRating> {
    const result = await this.model.aggregate([
      { $match: { targetId } },
      {
        $group: {
          _id: null,
          average: { $avg: '$score' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (result.length === 0) {
      return { average: 0, count: 0 };
    }

    return {
      average: Math.round(result[0].average * 10) / 10,
      count: result[0].count,
    };
  }

  /**
   * Executes the get user rating operation.
   *
   * @param raterId - The raterId parameter
   * @param targetId - The targetId parameter
   * @returns Result of type Promise<UserRatingEntity | null>
   */
  async getUserRating(raterId: string, targetId: string): Promise<UserRating | null> {
    const doc = await this.model.findOne({ raterId, targetId }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  /**
   * Executes the to entity operation.
   *
   * @param doc - The doc parameter
   * @returns Result of type UserRatingEntity
   */
  private toEntity(doc: UserRatingDocument): UserRating {
    return UserRating.reconstitute({
      id: doc._id.toString(),
      raterId: doc.raterId,
      targetId: doc.targetId,
      score: doc.score,
      comment: doc.comment,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
