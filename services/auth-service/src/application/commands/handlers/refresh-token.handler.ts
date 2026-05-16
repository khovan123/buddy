import { CryptoUtil } from '@libs/common';
import { Inject, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';
import type { IRefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository.interface';
import {
  REFRESH_TOKEN_REPOSITORY,
  TOKEN_SERVICE,
  USER_REPOSITORY,
} from '../../../domain/repositories/tokens';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import type { ITokenService } from '../../../domain/services/token.service.interface';
import { RefreshTokenCommand } from '../refresh-token.command';

/** CQRS Handler to execute  refresh token. */
@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler implements ICommandHandler<RefreshTokenCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param command - The command parameter
   */
  async execute(command: RefreshTokenCommand) {
    const tokenHash = CryptoUtil.sha256(command.rawRefreshToken);
    const stored = await this.refreshTokenRepository.findByHash(tokenHash);

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findById(stored.userId);
    if (!user || !user.canLogin()) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Rotate: delete old, issue new
    await this.refreshTokenRepository.deleteByHash(tokenHash);

    const { accessToken, refreshToken, refreshTokenHash, accessExpiresIn } =
      await this.tokenService.generateTokenPair(user);

    await this.refreshTokenRepository.save({
      id: uuidv4(),
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: this.tokenService.getRefreshExpiresAt(),
      createdAt: new Date(),
    });

    return { accessToken, refreshToken, accessExpiresIn };
  }
}

// ── Logout ────────────────────────────────────────────────────────
