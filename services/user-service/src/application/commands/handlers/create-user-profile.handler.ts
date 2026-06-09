import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserProfileAggregate } from '../../../domain/entities/user-profile.entity';
import { USER_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IUserProfileRepository } from '../../../domain/repositories/user-profile.repository.interface';
import { UserEventPublisher } from '../../../infrastructure/messaging/publishers/user-event.publisher';
import { CreateUserProfileCommand } from '../create-user-profile.command';

/** CQRS Handler to execute  create user profile. */
@CommandHandler(CreateUserProfileCommand)
export class CreateUserProfileHandler implements ICommandHandler<CreateUserProfileCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repo: IUserProfileRepository,
    private readonly publisher: UserEventPublisher,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param command - The command parameter
   */
  async execute(command: CreateUserProfileCommand): Promise<void> {
    // Idempotent: skip if already exists
    const exists = await this.repo.existsById(command.userId);
    if (exists) return;

    const user = UserProfileAggregate.create({
      userId: command.userId,
      email: command.email,
      username: command.username,
      nickname: command.nickname,
    });

    await this.repo.save(user);
  }
}
