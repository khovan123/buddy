import { OtpGeneratedEvent } from '@libs/contracts';
import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { IOtpRepository } from '../../../domain/repositories/otp.repository.interface';
import { OTP_REPOSITORY, USER_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { Otp } from '../../../domain/value-objects/otp.vo';
import { AuthEventPublisher } from '../../../infrastructure/messaging/publishers/auth-event.publisher';
import { ResendOtpCommand } from '../resend-otp.command';

/** CQRS Handler to execute  resend otp. */
@CommandHandler(ResendOtpCommand)
export class ResendOtpHandler implements ICommandHandler<ResendOtpCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(OTP_REPOSITORY) private readonly otpRepository: IOtpRepository,
    private readonly publisher: AuthEventPublisher,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param command - The command parameter
   */
  async execute(command: ResendOtpCommand) {
    const { email, purpose } = command;

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (purpose === 'EMAIL_VERIFICATION' && user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate & store OTP
    const otp = Otp.generate();
    await this.otpRepository.save(email, otp, purpose, Otp.TTL_SECONDS);

    // 5. Publish event to notification-service
    await this.publisher.publish(
      new OtpGeneratedEvent(
        {
          email,
          otp,
          purpose,
          expiresAt: new Date(Date.now() + Otp.TTL_SECONDS * 1000),
        },
        command.correlationId,
      ),
    );

    console.log(`[OTP] Resend OTP for ${email}: ${otp} (purpose: ${purpose})`);

    return { message: 'OTP sent successfully' };
  }
}
