import { User } from '../entities/user.entity';

/** Interface representing data constraints for  i user repository. */
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
  update(user: User): Promise<void>;
  delete(id: string): Promise<void>;
  existsByEmail(email: string): Promise<boolean>;
  existsByUsername(username: string): Promise<boolean>;
  updateSubscriptionPlan(userId: string, plan: string): Promise<void>;
  invalidateUserTokens(userId: string): Promise<void>;
}
