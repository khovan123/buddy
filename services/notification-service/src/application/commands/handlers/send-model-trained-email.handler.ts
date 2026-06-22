import { AppLogger } from '@libs/common';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Notification } from '../../../domain/entities/notification.entity';
import type { INotificationRepository } from '../../../domain/repositories/notification.repository.interface';
import { NOTIFICATION_REPOSITORY } from '../../../domain/repositories/tokens';
import { EmailService } from '../../../infrastructure/external/email/email.service';
import { SendModelTrainedEmailCommand } from '../send-model-trained-email.command';

/** CQRS Handler to send model training result email to admin. */
@CommandHandler(SendModelTrainedEmailCommand)
export class SendModelTrainedEmailHandler implements ICommandHandler<SendModelTrainedEmailCommand> {
  private readonly logger = new AppLogger(SendModelTrainedEmailHandler.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: INotificationRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(command: SendModelTrainedEmailCommand): Promise<void> {
    const statusLabel =
      command.status === 'completed'
        ? '✅ Training Completed'
        : command.status === 'rejected'
          ? '⚠️ Model Rejected'
          : '❌ Training Failed';

    const notification = Notification.create({
      userId: 'system',
      type: 'email',
      channel: 'model-trained',
      recipient: command.email,
      subject: `[Buddy ML] ${statusLabel} — ${command.version}`,
      templateId: 'model-trained',
      templateData: {
        status: command.status,
        statusLabel,
        version: command.version,
        timestamp: command.timestamp || new Date().toISOString(),
        epochs: command.epochs,
        fineTuneRounds: command.fineTuneRounds,
        totalPairs: command.totalPairs,
        positivePairs: command.positivePairs,
        finalLoss: command.finalLoss,
        finalAccuracy: command.finalAccuracy,
        valLoss: command.valLoss,
        valAccuracy: command.valAccuracy,
        vocabSizes: command.vocabSizes,
        evalBaseline: command.evalBaseline,
        evalFinal: command.evalFinal,
        reason: command.reason,
        threshold: command.threshold,
        isCompleted: command.status === 'completed',
        isRejected: command.status === 'rejected',
        isError: command.status === 'error',
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
      this.logger.log(`Model training email sent to ${command.email} [${command.status}]`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send model training email to ${command.email}`, errMsg);
      notification.markFailed(errMsg);
    }

    await this.repo.update(notification);
  }
}
