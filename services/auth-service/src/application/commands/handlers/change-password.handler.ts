import { CryptoUtil } from '@libs/common';
import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { USER_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { Password } from '../../../domain/value-objects/password.vo';
import { ChangePasswordCommand } from '../change-password.command';

/** CQRS Handler to change a user's password after verifying the current password. */
@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new BadRequestException('User account was not found');
    }

    const passwordMatches = await CryptoUtil.comparePassword(
      command.currentPassword,
      user.password.hashed,
    );
    if (!passwordMatches) {
      throw new BadRequestException('Current password is incorrect');
    }

    try {
      Password.validateStrength(command.newPassword);
    } catch (error: unknown) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }

    const samePassword = await CryptoUtil.comparePassword(
      command.newPassword,
      user.password.hashed,
    );
    if (samePassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    const hashedPassword = await CryptoUtil.hashPassword(command.newPassword);
    user.changePassword(hashedPassword);

    await this.userRepository.update(user);
    await this.userRepository.invalidateUserTokens(user.id);
  }
}
