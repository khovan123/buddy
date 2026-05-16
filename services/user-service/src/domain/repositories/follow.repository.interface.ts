import { PaginatedResult } from '@libs/contracts';

import { Follow } from '../entities/follow.entity';

/** Interface representing data constraints for  i follow repository. */
export interface IFollowRepository {
  follow(followerId: string, followingId: string): Promise<void>;
  unfollow(followerId: string, followingId: string): Promise<void>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string, page: number, limit: number): Promise<PaginatedResult<Follow>>;
  getFollowing(userId: string, page: number, limit: number): Promise<PaginatedResult<Follow>>;
  getFollowerCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
}
