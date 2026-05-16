import { REDIS_KEYS } from '@libs/common';
import { UserProfileUpdatedEvent } from '@libs/contracts';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Cache } from 'cache-manager';
import { DomainException } from '../../../domain/exceptions/domain.exception';
import { USER_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IUserProfileRepository } from '../../../domain/repositories/user-profile.repository.interface';
import { UserEventPublisher } from '../../../infrastructure/messaging/publishers/user-event.publisher';
import { UploadAvatarCommand } from '../upload-avatar.command';

/** CQRS Handler to execute  upload avatar. */
@CommandHandler(UploadAvatarCommand)
export class UploadAvatarHandler implements ICommandHandler<UploadAvatarCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repo: IUserProfileRepository,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly publisher: UserEventPublisher,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param command - The command parameter
   */
  async execute(command: UploadAvatarCommand) {
    const user = await this.repo.findById(command.userId);
    if (!user) throw new NotFoundException(`User ${command.userId} not found`);

    try {
      user.setAvatar(command.avatarUrl);
    } catch (e) {
      throw new BadRequestException(e instanceof DomainException ? e.message : String(e));
    }

    await this.repo.update(user);
    await this.cache.del(REDIS_KEYS.userProfile(command.userId));

    // Publish event so other services (e.g. content-service) can invalidate their cache
    await this.publisher.publish(
      new UserProfileUpdatedEvent({
        userId: command.userId,
        changes: {},
        updatedAt: new Date(),
      }),
    );

    return { avatarUrl: command.avatarUrl };
  }
}
