import { AppLogger } from '@libs/common';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Notification } from '../../../domain/entities/notification.entity';
import type { INotificationRepository } from '../../../domain/repositories/notification.repository.interface';
import { NOTIFICATION_REPOSITORY } from '../../../domain/repositories/tokens';
import { EmailService } from '../../../infrastructure/external/email/email.service';
import { SendWelcomeEmailCommand } from '../send-welcome-email.command';

/** CQRS Handler to execute  send welcome email. */
@CommandHandler(SendWelcomeEmailCommand)
export class SendWelcomeEmailHandler implements ICommandHandler<SendWelcomeEmailCommand> {
  private readonly logger = new AppLogger(SendWelcomeEmailHandler.name);

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
  async execute(command: SendWelcomeEmailCommand): Promise<void> {
    const notification = Notification.create({
      userId: command.userId,
      type: 'email',
      channel: 'welcome',
      recipient: command.email,
      subject: 'Welcome to MyApp!',
      templateId: 'welcome',
      templateData: {
        nickname: command.nickname,
        email: command.email,
        loginUrl: `${process.env.APP_URL}/login`,
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
      this.logger.error(`Failed to send welcome email to ${command.email}`, errMsg);
      notification.markFailed(errMsg);
    }

    await this.repo.update(notification);
  }
}
