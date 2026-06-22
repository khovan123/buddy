import { CryptoUtil } from '@libs/common';
import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  USER_REPOSITORY,
  VERIFICATION_TOKEN_REPOSITORY,
} from '../../../domain/repositories/tokens';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import type { IVerificationTokenRepository } from '../../../domain/repositories/verification-token.repository.interface';
import { Password } from '../../../domain/value-objects/password.vo';
import { ResetPasswordCommand } from '../reset-password.command';

/** CQRS Handler to reset a user's password using a valid password-reset token. */
@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler implements ICommandHandler<ResetPasswordCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY)
    private readonly verificationTokenRepository: IVerificationTokenRepository,
  ) {}

  /**
   * Executes the reset password operation.
   *
   * @param command - The command parameter
   */
  async execute(command: ResetPasswordCommand): Promise<void> {
    const { token, newPassword } = command;

    // Decode and find which email this token belongs to by searching all users
    // We store the raw token under the user's email key; extract email from token lookup
    // Strategy: the token is URL-safe so we find the email by brute-force is not feasible.
    // We expect the client to supply the email alongside the token (stored as key in Redis).
    // Since IOtpRepository keys on email+purpose, we embed the email in the token lookup.
    // The token format used in ForgotPasswordHandler: token = rawToken stored under email key.
    // The client passes email as query param; we validate token against that email.
    // ─── However, for stateless validation we store email in the token itself ───
    // Token format: base64url(email) + '.' + rawHex
    // This allows lookup without requiring the client to also send email separately.
    // Parse the composite token
    const dotIndex = token.indexOf('.');
    if (dotIndex === -1) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const emailEncoded = token.slice(0, dotIndex);
    const rawToken = token.slice(dotIndex + 1);

    let email: string;
    try {
      email = Buffer.from(emailEncoded, 'base64url').toString('utf8');
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Validate token against Redis
    const storedToken = await this.verificationTokenRepository.find(email, 'PASSWORD_RESET');
    if (!storedToken || storedToken !== rawToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Find user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Validate new password strength
    try {
      Password.validateStrength(newPassword);
    } catch (error: unknown) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }

    // Prevent reuse of the same password
    const samePassword = await CryptoUtil.comparePassword(newPassword, user.password.hashed);
    if (samePassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    // Hash and apply new password
    const hashedPassword = await CryptoUtil.hashPassword(newPassword);
    user.changePassword(hashedPassword);

    await this.userRepository.update(user);
    await this.userRepository.invalidateUserTokens(user.id);

    // Consume the token so it cannot be reused
    await this.verificationTokenRepository.delete(email, 'PASSWORD_RESET');
  }
}
