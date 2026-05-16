import { REDIS_KEYS } from '@libs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { Cache } from 'cache-manager';
import { USER_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IUserProfileRepository } from '../../../domain/repositories/user-profile.repository.interface';
import { GetUserByIdQuery } from '../get-user-by-id.query';

// ─────────────────────────────────────────────────────────────────
// GetUserById
// ─────────────────────────────────────────────────────────────────

/** CQRS Handler to execute  get user by id. */
@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repo: IUserProfileRepository,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param query - The query parameter
   */
  async execute(query: GetUserByIdQuery) {
    const cacheKey = REDIS_KEYS.userProfile(query.userId);

    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const user = await this.repo.findById(query.userId);
    if (!user) throw new NotFoundException(`User ${query.userId} not found`);

    const result = {
      id: user.id || user.userId,
      userId: user.userId,
      email: user.email,
      profile: user.profile,
      nickname: user.nickname,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    await this.cache.set(cacheKey, result, 300); // 5 min TTL
    return result;
  }
}
