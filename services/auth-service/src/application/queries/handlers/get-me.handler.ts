import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { User } from '../../../domain/entities/user.entity';
import { USER_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { GetMeQuery } from '../get-me.query';

/** Interface representing data constraints for  me result. */
export interface MeResult {
  id: string;
  email: string;
  nickname: string;
  roles: string[];
  status: string;
  emailVerified: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

/** CQRS Handler to execute  get me query. */
@QueryHandler(GetMeQuery)
export class GetMeQueryHandler implements IQueryHandler<GetMeQuery, MeResult> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param query - The query parameter
   * @returns Result of type Promise<MeResult>
   */
  async execute(query: GetMeQuery): Promise<MeResult> {
    const user = await this.userRepository.findById(query.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toResult(user);
  }

  /**
   * Executes the to result operation.
   *
   * @param user - The user parameter
   * @returns Result of type MeResult
   */
  private toResult(user: User): MeResult {
    return {
      id: user.id,
      email: user.email.value,
      nickname: user.nickname,
      roles: user.roles,
      status: user.status,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
