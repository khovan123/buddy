import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { USER_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { GetUserVerificationQuery } from '../get-user-verification.query';

/** Public-safe auth verification result. */
export interface UserVerificationResult {
  id: string;
  status: string;
  emailVerified: boolean;
}

@QueryHandler(GetUserVerificationQuery)
export class GetUserVerificationHandler implements IQueryHandler<
  GetUserVerificationQuery,
  UserVerificationResult
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: GetUserVerificationQuery): Promise<UserVerificationResult> {
    const user = await this.userRepository.findById(query.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      status: user.status,
      emailVerified: user.emailVerified,
    };
  }
}
