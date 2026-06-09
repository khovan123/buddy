import { PaginatedResult } from '@libs/contracts';
import { UserProfileAggregate } from '../entities/user-profile.entity';

/** Interface representing data constraints for  user filter. */
export interface UserFilter {
  isActive?: boolean;
  search?: string;
}

/** Interface representing data constraints for  i user profile repository. */
export interface IUserProfileRepository {
  findById(id: string): Promise<UserProfileAggregate | null>;
  findByIds(ids: string[]): Promise<UserProfileAggregate[]>;
  getBasicProfilesByIds(
    ids: string[],
  ): Promise<Array<{ userId: string; username: string; nickname: string; avatarUrl?: string }>>;
  findByEmail(email: string): Promise<UserProfileAggregate | null>;
  findAll(
    filter: UserFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<UserProfileAggregate>>;
  save(user: UserProfileAggregate): Promise<void>;
  update(user: UserProfileAggregate): Promise<void>;
  delete(id: string): Promise<void>;
  existsById(id: string): Promise<boolean>;
  existsByUsername(username: string): Promise<boolean>;
}
