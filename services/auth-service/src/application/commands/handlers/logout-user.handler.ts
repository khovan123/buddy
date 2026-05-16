import { CryptoUtil } from '@libs/common';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { IRefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository.interface';
import { REFRESH_TOKEN_REPOSITORY } from '../../../domain/repositories/tokens';
import { LogoutUserCommand } from '../logout-user.command';

/** CQRS Handler to execute  logout user. */
@CommandHandler(LogoutUserCommand)
export class LogoutUserHandler implements ICommandHandler<LogoutUserCommand> {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param command - The command parameter
   */
  async execute(command: LogoutUserCommand): Promise<void> {
    if (command.rawRefreshToken) {
      const tokenHash = CryptoUtil.sha256(command.rawRefreshToken);
      await this.refreshTokenRepository.deleteByHash(tokenHash);
    } else {
      // Logout all sessions
      await this.refreshTokenRepository.deleteByUserId(command.userId);
    }
  }
}
