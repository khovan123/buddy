import { CryptoUtil } from '@libs/common';
import { OtpGeneratedEvent, UserLoggedInEvent } from '@libs/contracts';
import { Inject, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';
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
import { AuthEventPublisher } from '../../../infrastructure/messaging/publishers/auth-event.publisher';
import { LoginUserCommand } from '../login-user.command';

/** CQRS Handler to execute  login user. */
@CommandHandler(LoginUserCommand)
export class LoginUserHandler implements ICommandHandler<LoginUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(OTP_REPOSITORY)
    private readonly otpRepository: IOtpRepository,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService,
    private readonly publisher: AuthEventPublisher,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param command - The command parameter
   */
  async execute(command: LoginUserCommand) {
    const { email, password, ipAddress, userAgent, correlationId } = command;

    // 1. Find user
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // 2. Domain guard
    if (!user.canLogin()) {
      throw new UnauthorizedException(`Account status: ${user.status}`);
    }

    // 3. Verify password
    const isValid = await CryptoUtil.comparePassword(password, user.password.hashed);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    // 4. Check if email is verified
    if (!user.emailVerified) {
      // Generate OTP for email verification
      const otp = Otp.generate();
      await this.otpRepository.save(email, otp, 'EMAIL_VERIFICATION', Otp.TTL_SECONDS);

      // 4.5. publish OTP event
      await this.publisher.publish(
        new OtpGeneratedEvent(
          {
            email,
            otp,
            purpose: 'EMAIL_VERIFICATION',
            expiresAt: new Date(Date.now() + Otp.TTL_SECONDS * 1000),
          },
          correlationId,
        ),
      );

      console.log(`[OTP] Login verification OTP for ${email}: ${otp}`);

      return {
        requiresVerification: true,
        email: user.email.value,
        user: {
          id: user.id,
          email: user.email.value,
          nickname: user.nickname,
          role: user.roles[0] ?? 'user',
        },
      };
    }

    // 5. Record login
    user.recordLogin();
    await this.userRepository.update(user);

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

    // 8. Publish event
    await this.publisher.publish(
      new UserLoggedInEvent(
        {
          userId: user.id,
          email: user.email.value,
          ipAddress: ipAddress || '',
          userAgent: userAgent || '',
        },
        correlationId,
      ),
    );

    return {
      user: {
        id: user.id,
        email: user.email.value,
        nickname: user.nickname,
        role: user.roles[0] ?? 'user',
      },
      accessToken,
      refreshToken,
      accessExpiresIn,
    };
  }
}
