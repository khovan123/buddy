import { CryptoUtil } from '@libs/common';
import { OtpGeneratedEvent } from '@libs/contracts';
import { BadRequestException, ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { User } from '../../../domain/entities/user.entity';
import type { IVerificationTokenRepository } from '../../../domain/repositories/verification-token.repository.interface';
import { USER_REPOSITORY, VERIFICATION_TOKEN_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { Otp } from '../../../domain/value-objects/otp.vo';
import { Password } from '../../../domain/value-objects/password.vo';
import { AuthEventPublisher } from '../../../infrastructure/messaging/publishers/auth-event.publisher';
import { RegisterUserCommand } from '../register-user.command';

/** Interface representing data constraints for  register user result. */
export interface RegisterUserResult {
  userId: string;
  email: string;
  requiresVerification: boolean;
}

/** CQRS Handler to execute  register user. */
@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY)
    private readonly verificationTokenRepository: IVerificationTokenRepository,
    private readonly publisher: AuthEventPublisher,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param command - The command parameter
   * @returns Result of type Promise<RegisterUserResult>
   */
  async execute(command: RegisterUserCommand): Promise<RegisterUserResult> {
    const { email, password, nickname, correlationId } = command;

    // 1. Validate password strength (domain rule)
    try {
      Password.validateStrength(password);
    } catch (e: unknown) {
      throw new BadRequestException(e instanceof Error ? e.message : String(e));
    }

    // 2. Check email uniqueness
    const exists = await this.userRepository.existsByEmail(email);
    if (exists) {
      throw new ConflictException(`Email ${email} is already registered`);
    }

    // 3. Hash password
    const hashedPassword = await CryptoUtil.hashPassword(password);

    // 4. Create domain entity (status: pending_verification)
    let user: User;
    try {
      user = User.create({ email, hashedPassword, nickname });
    } catch (e: unknown) {
      throw new BadRequestException(e instanceof Error ? e.message : String(e));
    }

    // 5. Persist
    await this.userRepository.save(user);

    // 6. Generate OTP and store in Redis
    const otp = Otp.generate();
    await this.verificationTokenRepository.save(email, otp, 'EMAIL_VERIFICATION', Otp.TTL_SECONDS);

    // 7.5. Publish OTP event to notification-service for email delivery
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

    console.log(`[OTP] Registration OTP for ${email}: ${otp}`);

    // 8. Return — NO tokens. User must verify OTP first.
    return {
      userId: user.id,
      email: user.email.value,
      requiresVerification: true,
    };
  }
}
