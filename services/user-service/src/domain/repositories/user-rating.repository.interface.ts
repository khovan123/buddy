import { PaginatedResult } from '@libs/contracts';

import { AverageRating, UserRating } from '../entities/user-rating.entity';

/** Interface representing data constraints for  i user rating repository. */
export interface IUserRatingRepository {
  rate(raterId: string, targetId: string, score: number, comment?: string): Promise<UserRating>;
  deleteRating(raterId: string, targetId: string): Promise<void>;
  getRatingsForUser(
    targetId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<UserRating>>;
  getAverageRating(targetId: string): Promise<AverageRating>;
  getUserRating(raterId: string, targetId: string): Promise<UserRating | null>;
}
