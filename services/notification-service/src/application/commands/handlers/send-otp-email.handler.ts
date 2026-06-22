import { AppLogger } from '@libs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EmailService } from '../../../infrastructure/external/email/email.service';
import { SendOtpEmailCommand } from '../send-otp-email.command';

/** CQRS Handler to execute  send otp email. */
@CommandHandler(SendOtpEmailCommand)
export class SendOtpEmailHandler implements ICommandHandler<SendOtpEmailCommand> {
  private readonly logger = new AppLogger(SendOtpEmailHandler.name);

  constructor(private readonly emailService: EmailService) {}

  /**
   * Executes the execute operation.
   *
   * @param command - The command parameter
   */
  async execute(command: SendOtpEmailCommand): Promise<void> {
    const { email, otp, purpose, expiresAt, correlationId } = command;

    this.logger.log(`Sending OTP email to ${email} (Purpose: ${purpose})`, { correlationId });

    let subject = 'Your Verification Code';
    if (purpose === 'EMAIL_VERIFICATION') {
      subject = 'Please Verify Your Buddy Account';
    } else if (purpose === 'PASSWORD_RESET') {
      subject = 'Your Buddy Password Reset Code';
    }

    try {
      await this.emailService.send({
        to: email,
        subject,
        template: 'otp-verification',
        context: {
          otp,
          purpose,
          expiresAt: expiresAt.toLocaleString('en-US', { timeZoneName: 'short' }),
          correlationId,
          currentYear: new Date().getFullYear(),
        },
      });

      this.logger.log(`Successfully sent OTP email to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}`, String(error));
      throw error; // Will be retried if RMQ subscriber re-queues it
    }
  }
}
