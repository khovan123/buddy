import { BadRequestException, Inject, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID as uuidv4 } from 'node:crypto';
import type { IOtpRepository } from '../../../domain/repositories/otp.repository.interface';
import type { IRefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository.interface';
import {
  OTP_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
  TOKEN_SERVICE,
  USER_REPOSITORY,
} from '../../../domain/repositories/tokens';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import type { ITokenService } from '../../../domain/services/token.service.interface';
import { Otp } from '../../../domain/value-objects/otp.vo';
import { VerifyOtpCommand } from '../verify-otp.command';

/** CQRS Handler to execute  verify otp. */
@CommandHandler(VerifyOtpCommand)
export class VerifyOtpHandler implements ICommandHandler<VerifyOtpCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(OTP_REPOSITORY) private readonly otpRepository: IOtpRepository,
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
  async execute(command: VerifyOtpCommand) {
    const { email, otp, ipAddress, userAgent } = command;

    if (!Otp.validate(otp)) {
      throw new BadRequestException('OTP must be a 6-digit code');
    }

    // 1. Find stored OTP
    const storedOtp = await this.otpRepository.find(email, 'EMAIL_VERIFICATION');
    if (!storedOtp) {
      throw new UnauthorizedException('OTP expired or not found. Please request a new one.');
    }

    // 2. Compare
    if (storedOtp !== otp) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    // 3. Find user and verify email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 4. Mark email verified (domain: status → active)
    if (!user.emailVerified) {
      user.verifyEmail();
      await this.userRepository.update(user);
    }

    // 5. Clean up OTP
    await this.otpRepository.delete(email, 'EMAIL_VERIFICATION');

    // 6. Generate tokens
    const { accessToken, refreshToken, refreshTokenHash, accessExpiresIn } =
      await this.tokenService.generateTokenPair(user);

    // 7. Persist refresh token
    await this.refreshTokenRepository.save({
      id: uuidv4(),
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: this.tokenService.getRefreshExpiresAt(),
      createdAt: new Date(),
      ipAddress,
      userAgent,
    });

    return {
      user: {
        id: user.id,
        email: user.email.value,
        username: user.username,
        nickname: user.nickname,
        role: user.roles[0] ?? 'user',
        roles: user.roles,
        subscriptionPlan: user.subscriptionPlan,
      },
      accessToken,
      refreshToken,
      accessExpiresIn,
    };
  }
}
