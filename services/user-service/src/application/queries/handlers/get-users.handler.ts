import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { USER_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IUserProfileRepository } from '../../../domain/repositories/user-profile.repository.interface';
import { GetUsersQuery } from '../get-users.query';

/** CQRS Handler to execute  get users. */
@QueryHandler(GetUsersQuery)
export class GetUsersHandler implements IQueryHandler<GetUsersQuery> {
  constructor(@Inject(USER_REPOSITORY) private readonly repo: IUserProfileRepository) {}

  /**
   * Executes the execute operation.
   *
   * @param query - The query parameter
   */
  async execute(query: GetUsersQuery) {
    return this.repo.findAll(
      { search: query.search, isActive: query.isActive },
      query.page,
      query.limit,
    );
  }
}
