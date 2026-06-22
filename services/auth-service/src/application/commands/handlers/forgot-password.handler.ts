import { CryptoUtil } from '@libs/common';
import { PasswordResetRequestedEvent } from '@libs/contracts';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { IVerificationTokenRepository } from '../../../domain/repositories/verification-token.repository.interface';
import { USER_REPOSITORY, VERIFICATION_TOKEN_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { AuthEventPublisher } from '../../../infrastructure/messaging/publishers/auth-event.publisher';
import { ForgotPasswordCommand } from '../forgot-password.command';

/** TTL for password reset tokens: 1 hour */
const RESET_TOKEN_TTL_SECONDS = 3600;

/** CQRS Handler to generate and dispatch a password reset link via email. */
@CommandHandler(ForgotPasswordCommand)
export class ForgotPasswordHandler implements ICommandHandler<ForgotPasswordCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY)
    private readonly verificationTokenRepository: IVerificationTokenRepository,
    private readonly publisher: AuthEventPublisher,
  ) {}

  /**
   * Executes the forgot password operation.
   *
   * @param command - The command parameter
   */
  async execute(command: ForgotPasswordCommand): Promise<void> {
    const { email, appUrl, correlationId } = command;

    // Silently succeed even if email not found (prevents user enumeration)
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return;
    }

    // Generate a secure random token and store it in Redis
    // Build composite token: base64url(email) + '.' + rawHex
    // This allows the reset endpoint to identify the user without a separate email param
    const rawToken = CryptoUtil.generateSecureToken(32);
    const emailEncoded = Buffer.from(email).toString('base64url');
    const compositeToken = `${emailEncoded}.${rawToken}`;
    await this.verificationTokenRepository.save(email, rawToken, 'PASSWORD_RESET', RESET_TOKEN_TTL_SECONDS);

    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_SECONDS * 1000);
    const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(compositeToken)}`;

    // Publish event so notification-service can send the reset email
    await this.publisher.publish(
      new PasswordResetRequestedEvent(
        {
          userId: user.id,
          email,
          resetToken: compositeToken,
          expiresAt,
        },
        correlationId,
      ),
    );

    // Fallback: log reset link for dev/test environments
    console.log(`[PASSWORD_RESET] Reset link for ${email}: ${resetLink}`);
  }
}
