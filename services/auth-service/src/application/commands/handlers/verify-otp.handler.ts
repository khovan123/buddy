import { SubscriptionPlan, UserRegisteredEvent } from '@libs/contracts';
import { BadRequestException, Inject, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID as uuidv4 } from 'node:crypto';
import type { IRefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository.interface';
import {
  REFRESH_TOKEN_REPOSITORY,
  TOKEN_SERVICE,
  USER_REPOSITORY,
  VERIFICATION_TOKEN_REPOSITORY,
} from '../../../domain/repositories/tokens';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import type { IVerificationTokenRepository } from '../../../domain/repositories/verification-token.repository.interface';
import type { ITokenService } from '../../../domain/services/token.service.interface';
import { Otp } from '../../../domain/value-objects/otp.vo';
import { AuthEventPublisher } from '../../../infrastructure/messaging/publishers/auth-event.publisher';
import { VerifyOtpCommand } from '../verify-otp.command';

/** CQRS Handler to execute  verify otp. */
@CommandHandler(VerifyOtpCommand)
export class VerifyOtpHandler implements ICommandHandler<VerifyOtpCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY)
    private readonly verificationTokenRepository: IVerificationTokenRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService,
    private readonly publisher: AuthEventPublisher,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param command - The command parameter
   */
  async execute(command: VerifyOtpCommand) {
    const { email, otp, ipAddress, userAgent, correlationId } = command;

    if (!Otp.validate(otp)) {
      throw new BadRequestException('OTP must be a 6-digit code');
    }

    // 1. Find stored OTP
    const storedOtp = await this.verificationTokenRepository.find(email, 'EMAIL_VERIFICATION');
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

    const subscriptionPlan = await this.ensureDefaultSubscriptionPlan(
      user.id,
      user.subscriptionPlan,
    );

    // 5. Clean up OTP
    await this.verificationTokenRepository.delete(email, 'EMAIL_VERIFICATION');

    // 6. Publish domain event
    await this.publisher.publish(
      new UserRegisteredEvent(
        {
          userId: user.id,
          email: user.email.value,
          nickname: user.nickname,
          registeredAt: user.createdAt,
        },
        correlationId,
      ),
    );

    // 7. Generate tokens
    const { accessToken, refreshToken, refreshTokenHash, accessExpiresIn } =
      await this.tokenService.generateTokenPair(user, { subscriptionPlan });

    // 8. Persist refresh token
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
        nickname: user.nickname,
        role: user.roles[0] ?? 'user',
        roles: user.roles,
        subscriptionPlan,
      },
      accessToken,
      refreshToken,
      accessExpiresIn,
    };
  }

  private async ensureDefaultSubscriptionPlan(
    userId: string,
    subscriptionPlan: string | null,
  ): Promise<string> {
    if (subscriptionPlan) {
      return subscriptionPlan;
    }

    await this.userRepository.updateSubscriptionPlan(userId, SubscriptionPlan.STUDENT_FREE);

    return SubscriptionPlan.STUDENT_FREE;
  }
}
