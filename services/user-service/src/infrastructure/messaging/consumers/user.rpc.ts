import { Nack, RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { AppLogger, EXCHANGES, QUEUES } from '@libs/common';
import { GetUsersProfilesEvent, USER_RPC, UserProfileRpcResponseDto } from '@libs/contracts';
import { Controller, Inject } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IUserProfileRepository } from '../../../domain/repositories/user-profile.repository.interface';

@Controller()
export class UserRpcController {
  private readonly logger = new AppLogger(UserRpcController.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserProfileRepository,
  ) {}

  @RabbitRPC({
    exchange: EXCHANGES.USER,
    routingKey: USER_RPC.GET_USERS_PROFILES,
    queue: QUEUES.USER_RPC_GET_PROFILES,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async getUsersProfiles(data: GetUsersProfilesEvent): Promise<UserProfileRpcResponseDto[] | Nack> {
    if (!data.payload?.userIds || data.payload.userIds.length === 0) {
      return [];
    }

    try {
      const uniqueIds = Array.from(new Set(data.payload.userIds)).slice(0, 100);
      const users = await this.userRepository.findByIds(uniqueIds);
      return users.map((user) => ({
        id: user.userId,
        nickname: user.nickname,
        email: user.email,
        avatarUrl: user.profile.avatarUrl,
        phone: user.profile.phone,
        bio: user.profile.bio,
        dateOfBirth: user.profile.dateOfBirth,
        semester: user.profile.semester,
        career: user.profile.career,
        skills: user.profile.skills,
        majorId: user.profile.majorId,
      }));
    } catch (err) {
      this.logger.error(
        `Error processing GET_USERS_PROFILES: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
        { context: 'UserServiceConsumer' },
      );
      return new Nack(false); // send to DLX
    }
  }
}
