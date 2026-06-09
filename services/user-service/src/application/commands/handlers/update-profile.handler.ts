import { REDIS_KEYS } from '@libs/common';
import { UserProfileUpdatedEvent } from '@libs/contracts';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Cache } from 'cache-manager';
import { UserProfileAggregate } from '../../../domain/entities/user-profile.entity';
import { DomainException } from '../../../domain/exceptions/domain.exception';
import { USER_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IUserProfileRepository } from '../../../domain/repositories/user-profile.repository.interface';
import { generateUniqueUsername } from '../../../domain/value-objects/username.vo';
import { UserEventPublisher } from '../../../infrastructure/messaging/publishers/user-event.publisher';
import { UpdateProfileCommand } from '../update-profile.command';

/** CQRS Handler to execute  update profile. */
@CommandHandler(UpdateProfileCommand)
export class UpdateProfileHandler implements ICommandHandler<UpdateProfileCommand> {
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
  async execute(command: UpdateProfileCommand) {
    let user = await this.repo.findById(command.userId);
    if (command.changes.username && (await this.repo.existsByUsername(command.changes.username))) {
      throw new BadRequestException(`${command.changes.username} is already existed!`);
    }

    if (!user) {
      // Create user if not found
      const email = command.email || 'unknown@example.com';
      user = UserProfileAggregate.create({
        userId: command.userId,
        email,
        username: await generateUniqueUsername(email, this.repo),
        nickname: command.changes.nickname || 'User',
      });
      try {
        user.updateProfile(command.changes);
      } catch (e) {
        throw new BadRequestException(e instanceof DomainException ? e.message : String(e));
      }
      await this.repo.save(user);
    } else {
      try {
        user.updateProfile(command.changes);
      } catch (e) {
        throw new BadRequestException(e instanceof DomainException ? e.message : String(e));
      }
      await this.repo.update(user);
    }

    // Bust cache
    await this.cache.del(REDIS_KEYS.userProfile(command.userId));

    // Publish domain event (enriched with recommendation-relevant fields)
    const profile = user.profile;
    await this.publisher.publish(
      new UserProfileUpdatedEvent(
        {
          userId: user.userId,
          changes: {
            ...command.changes,
            majorId: profile.majorId,
            courseId: profile.courseId,
            semester: profile.semester,
            careerId: profile.careerId,
            skillIds: profile.skillIds,
          },
          updatedAt: user.updatedAt,
        },
        command.correlationId,
      ),
    );

    return {
      id: user.id || user.userId,
      userId: user.userId,
      profile: user.profile,
      updatedAt: user.updatedAt,
    };
  }
}
