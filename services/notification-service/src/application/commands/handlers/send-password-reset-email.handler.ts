import { AppLogger } from '@libs/common';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Notification } from '../../../domain/entities/notification.entity';
import type { INotificationRepository } from '../../../domain/repositories/notification.repository.interface';
import { NOTIFICATION_REPOSITORY } from '../../../domain/repositories/tokens';
import { EmailService } from '../../../infrastructure/external/email/email.service';
import { SendPasswordResetEmailCommand } from '../send-password-reset-email.command';

/** CQRS Handler to execute  send password reset email. */
@CommandHandler(SendPasswordResetEmailCommand)
export class SendPasswordResetEmailHandler implements ICommandHandler<SendPasswordResetEmailCommand> {
  private readonly logger = new AppLogger(SendPasswordResetEmailHandler.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: INotificationRepository,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param command - The command parameter
   */
  async execute(command: SendPasswordResetEmailCommand): Promise<void> {
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${command.resetToken}`;
    const expiresIn = '1 hour';

    const notification = Notification.create({
      userId: command.userId,
      type: 'email',
      channel: 'password_reset',
      recipient: command.email,
      subject: 'Reset your password',
      templateId: 'password_reset',
      templateData: {
        nickname: command.nickname,
        resetUrl,
        expiresIn,
      },
      correlationId: command.correlationId,
    });

    await this.repo.save(notification);

    try {
      await this.emailService.send({
        to: notification.recipient,
        subject: notification.subject!,
        template: notification.templateId,
        context: notification.templateData,
      });
      notification.markSent();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send password reset email to ${command.email}`, errMsg);
      notification.markFailed(errMsg);
    }

    await this.repo.update(notification);
  }
}
