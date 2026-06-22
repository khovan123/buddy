import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import {
  AppLogger,
  CORRELATION_ID_HEADER,
  EXCHANGES,
  QUEUES,
  RETRY_OPTIONS,
  ensureCorrelationId,
  runWithCorrelationId,
} from '@libs/common';
import {
  AUTH_ROUTINGKEYS,
  BILLING_ROUTINGKEYS,
  CONTENT_ROUTINGKEYS,
  ContentModerationCompletedEvent,
  ForumMentionCreatedPayload,
  INTERACTION_ROUTINGKEYS,
  PurchaseCompletedEvent,
  RECOMMENDATION_ROUTINGKEYS,
  extractRmqPayload,
} from '@libs/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type { ConsumeMessage } from 'amqplib';
import { SendModelTrainedEmailCommand } from '../../../application/commands/send-model-trained-email.command';
import { SendOtpEmailCommand } from '../../../application/commands/send-otp-email.command';
import { SendPasswordResetEmailCommand } from '../../../application/commands/send-password-reset-email.command';
import { SendWelcomeEmailCommand } from '../../../application/commands/send-welcome-email.command';
import { NotificationStreamService } from '../../../application/notifications/notification-stream.service';
import { Notification } from '../../../domain/entities/notification.entity';
import type { INotificationRepository } from '../../../domain/repositories/notification.repository.interface';
import { NOTIFICATION_REPOSITORY } from '../../../domain/repositories/tokens';
import { NotificationEventPublisher } from '../publishers/notification-event.publisher';

type EventEnvelope<T extends object> = {
  data?: {
    payload?: T;
    correlationId?: string;
  };
  payload?: T;
  correlationId?: string;
} & Partial<T>;

type ModelTrainedPayload = {
  email: string;
  status: string;
  version: string;
  timestamp: string;
  epochs: number;
  fineTuneRounds: number;
  totalPairs: number;
  positivePairs: number;
  finalLoss: number;
  finalAccuracy: number;
  valLoss: number;
  valAccuracy: number;
  vocabSizes: Record<string, number>;
  evalBaseline: { hitrateAt50: number; mrr: number; usersEvaluated: number };
  evalFinal: { hitrateAt50: number; mrr: number; usersEvaluated: number };
  reason: string;
  threshold: number;
};

/** RabbitMQ consumer for auth-related notification events. */
@Injectable()
export class NotificationConsumer {
  private readonly logger = new AppLogger(NotificationConsumer.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly notificationPublisher: NotificationEventPublisher,
    private readonly notificationStream: NotificationStreamService,
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  private getPayload<T extends object>(event: EventEnvelope<T>): T | undefined {
    return extractRmqPayload<T>(event, []);
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private isValidDateString(value: unknown): value is string {
    return this.isNonEmptyString(value) && !Number.isNaN(new Date(value).getTime());
  }

  private isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  // ─── billing.purchase.completed ───────────────────────────────────────────
  @RabbitSubscribe({
    exchange: EXCHANGES.BILLING,
    routingKey: BILLING_ROUTINGKEYS.PURCHASE_COMPLETED,
    queue: QUEUES.NOTIFICATION_IN_APP_PURCHASE_COMPLETED,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handlePurchaseCompleted(
    data: EventEnvelope<PurchaseCompletedEvent['payload']>,
  ): Promise<void | Nack> {
    const payload = this.getPayload(data);

    if (
      !payload ||
      !this.isNonEmptyString(payload.purchaseId) ||
      !this.isNonEmptyString(payload.buyerId) ||
      !this.isNonEmptyString(payload.sellerId) ||
      !this.isNonEmptyString(payload.amount) ||
      !Array.isArray(payload.items)
    ) {
      this.logger.warn(`Dropping malformed [${BILLING_ROUTINGKEYS.PURCHASE_COMPLETED}] event`);
      return new Nack(false);
    }

    const templateData = {
      purchaseId: payload.purchaseId,
      amount: payload.amount,
      itemCount: payload.items.length,
      items: payload.items,
      purchasedAt: payload.purchasedAt,
    };

    const [buyerNotification, sellerNotification] = await Promise.all([
      this.notificationRepository.save(
        Notification.create({
          userId: payload.buyerId,
          type: 'in_app',
          channel: 'purchase',
          recipient: payload.buyerId,
          subject: 'Purchase completed',
          templateId: 'purchase-buyer',
          templateData,
          correlationId: data.correlationId ?? payload.purchaseId,
        }),
      ),
      this.notificationRepository.save(
        Notification.create({
          userId: payload.sellerId,
          type: 'in_app',
          channel: 'purchase',
          recipient: payload.sellerId,
          subject: 'New content sale',
          templateId: 'purchase-seller',
          templateData: {
            ...templateData,
            buyerId: payload.buyerId,
          },
          correlationId: data.correlationId ?? payload.purchaseId,
        }),
      ),
    ]);

    this.notificationStream.publish(buyerNotification);
    this.notificationStream.publish(sellerNotification);
  }

  // ─── content.moderation.completed ─────────────────────────────────────────
  @RabbitSubscribe({
    exchange: EXCHANGES.CONTENT,
    routingKey: CONTENT_ROUTINGKEYS.MODERATION_COMPLETED,
    queue: QUEUES.NOTIFICATION_IN_APP_CONTENT_MODERATION,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleContentModerationCompleted(
    data: EventEnvelope<ContentModerationCompletedEvent['payload']>,
  ): Promise<void | Nack> {
    const payload = this.getPayload(data);

    if (
      !payload ||
      !this.isNonEmptyString(payload.contentId) ||
      !this.isNonEmptyString(payload.contentType) ||
      !this.isNonEmptyString(payload.ownerId) ||
      !this.isNonEmptyString(payload.title) ||
      !this.isNonEmptyString(payload.decision) ||
      !(payload.score === null || this.isFiniteNumber(payload.score)) ||
      !Array.isArray(payload.reasons) ||
      !this.isNonEmptyString(payload.ruleVersion) ||
      !this.isValidDateString(payload.moderatedAt)
    ) {
      this.logger.warn(`Dropping malformed [${CONTENT_ROUTINGKEYS.MODERATION_COMPLETED}] event`);
      return new Nack(false);
    }

    const notification = await this.notificationRepository.save(
      Notification.create({
        userId: payload.ownerId,
        type: 'in_app',
        channel: 'content-moderation',
        recipient: payload.ownerId,
        subject:
          payload.decision === 'APPROVED'
            ? 'Content approved'
            : payload.decision === 'REJECTED'
              ? 'Content rejected'
              : 'Content moderation completed',
        templateId: 'content-moderation-completed',
        templateData: {
          contentId: payload.contentId,
          contentType: payload.contentType,
          title: payload.title,
          slug: payload.slug,
          decision: payload.decision,
          score: payload.score,
          reasons: payload.reasons,
          ruleVersion: payload.ruleVersion,
          moderatedAt: payload.moderatedAt,
        },
        correlationId: data.correlationId ?? payload.contentId,
      }),
    );

    this.notificationStream.publish(notification);
  }

  @RabbitSubscribe({
    exchange: EXCHANGES.INTERACTION,
    routingKey: INTERACTION_ROUTINGKEYS.FORUM_MENTION_CREATED,
    queue: QUEUES.NOTIFICATION_IN_APP_FORUM_MENTION,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleForumMentionCreated(
    data: EventEnvelope<ForumMentionCreatedPayload>,
  ): Promise<void | Nack> {
    const payload = this.getPayload(data);

    if (
      !payload ||
      !this.isNonEmptyString(payload.mentionedUserId) ||
      !this.isNonEmptyString(payload.actorName) ||
      !this.isNonEmptyString(payload.topicTitle) ||
      !this.isNonEmptyString(payload.messageId) ||
      !this.isNonEmptyString(payload.href)
    ) {
      this.logger.warn(
        `Dropping malformed [${INTERACTION_ROUTINGKEYS.FORUM_MENTION_CREATED}] event`,
      );
      return new Nack(false);
    }

    const notification = await this.notificationRepository.save(
      Notification.create({
        userId: payload.mentionedUserId,
        type: 'in_app',
        channel: 'forum-mention',
        recipient: payload.mentionedUserId,
        subject: `${payload.actorName} mentioned you`,
        templateId: 'forum-mention',
        templateData: {
          actorId: payload.actorId,
          actorName: payload.actorName,
          topicId: payload.topicId,
          topicTitle: payload.topicTitle,
          messageId: payload.messageId,
          excerpt: payload.excerpt,
          href: payload.href,
          createdAt: payload.createdAt,
        },
        correlationId: data.correlationId ?? payload.messageId,
      }),
    );

    this.notificationStream.publish(notification);
  }

  private isNumberRecord(value: unknown): value is Record<string, number> {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.values(value).every((entry) => this.isFiniteNumber(entry))
    );
  }

  private isEvalMetrics(
    value: unknown,
  ): value is { hitrateAt50: number; mrr: number; usersEvaluated: number } {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    const metrics = value as Record<string, unknown>;
    return (
      this.isFiniteNumber(metrics.hitrateAt50) &&
      this.isFiniteNumber(metrics.mrr) &&
      this.isFiniteNumber(metrics.usersEvaluated)
    );
  }

  private isModelTrainedPayload(payload: unknown): payload is ModelTrainedPayload {
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      return false;
    }

    const candidate = payload as Record<string, unknown>;
    return (
      this.isNonEmptyString(candidate.email) &&
      this.isNonEmptyString(candidate.status) &&
      this.isNonEmptyString(candidate.version) &&
      this.isNonEmptyString(candidate.timestamp) &&
      this.isFiniteNumber(candidate.epochs) &&
      this.isFiniteNumber(candidate.fineTuneRounds) &&
      this.isFiniteNumber(candidate.totalPairs) &&
      this.isFiniteNumber(candidate.positivePairs) &&
      this.isFiniteNumber(candidate.finalLoss) &&
      this.isFiniteNumber(candidate.finalAccuracy) &&
      this.isFiniteNumber(candidate.valLoss) &&
      this.isFiniteNumber(candidate.valAccuracy) &&
      this.isNumberRecord(candidate.vocabSizes) &&
      this.isEvalMetrics(candidate.evalBaseline) &&
      this.isEvalMetrics(candidate.evalFinal) &&
      typeof candidate.reason === 'string' &&
      this.isFiniteNumber(candidate.threshold)
    );
  }

  // ─── auth.user.registered ─────────────────────────────────────────────────
  @RabbitSubscribe({
    exchange: EXCHANGES.AUTH,
    routingKey: AUTH_ROUTINGKEYS.USER_REGISTERED,
    queue: QUEUES.NOTIFICATION_EMAIL_USER_REGISTERED,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleUserRegistered(
    data: EventEnvelope<{ userId: string; email: string; nickname: string }>,
    amqpMsg: ConsumeMessage,
  ): Promise<void | Nack> {
    const headers = amqpMsg.properties.headers ?? {};
    const retryCount: number = headers['x-retry-count'] ?? 0;
    const payload = this.getPayload(data);
    const correlationId = ensureCorrelationId(
      data.correlationId,
      headers[CORRELATION_ID_HEADER],
      headers['x-original-correlation-id'],
      amqpMsg.properties.correlationId,
      amqpMsg.properties.messageId,
    );
    if (
      !payload ||
      !this.isNonEmptyString(payload.userId) ||
      !this.isNonEmptyString(payload.email) ||
      !this.isNonEmptyString(payload.nickname)
    ) {
      this.logger.warn(`Dropping malformed [${AUTH_ROUTINGKEYS.USER_REGISTERED}] event`, {
        correlationId,
      });
      return new Nack(false);
    }

    try {
      await runWithCorrelationId(correlationId, async () => {
        this.logger.log(`Processing welcome email for ${payload.email} [Retry: ${retryCount}]`, {
          correlationId,
        });

        await this.commandBus.execute(
          new SendWelcomeEmailCommand(
            payload.userId,
            payload.email,
            payload.nickname,
            correlationId,
          ),
        );
      });
    } catch (error) {
      if (retryCount < RETRY_OPTIONS.MAX_RETRIES) {
        this.logger.warn(
          `Failure handling [${AUTH_ROUTINGKEYS.USER_REGISTERED}] for ${payload.email}. ` +
            `Retrying (${retryCount + 1}/${RETRY_OPTIONS.MAX_RETRIES})...`,
          String(error),
        );
        await this.notificationPublisher.republishWithDelay(
          AUTH_ROUTINGKEYS.USER_REGISTERED,
          data,
          retryCount + 1,
        );
        return; // ack original (retry is republished)
      }

      this.logger.error(
        `MAX RETRIES EXCEEDED for [${AUTH_ROUTINGKEYS.USER_REGISTERED}] [${payload.email}]`,
        String(error),
      );
      return new Nack(false); // → dead.letter exchange
    }
  }

  // ─── auth.password.reset.requested ───────────────────────────────────────
  @RabbitSubscribe({
    exchange: EXCHANGES.AUTH,
    routingKey: AUTH_ROUTINGKEYS.PASSWORD_RESET_REQUESTED,
    queue: QUEUES.NOTIFICATION_EMAIL_PASSWORD_RESET,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handlePasswordResetRequested(
    data: EventEnvelope<{
      userId: string;
      email: string;
      nickname: string;
      resetToken: string;
      expiresAt: string;
    }>,
    amqpMsg: ConsumeMessage,
  ): Promise<void | Nack> {
    const headers = amqpMsg.properties.headers ?? {};
    const retryCount: number = headers['x-retry-count'] ?? 0;
    const payload = this.getPayload(data);
    const correlationId = ensureCorrelationId(
      data.correlationId,
      headers[CORRELATION_ID_HEADER],
      headers['x-original-correlation-id'],
      amqpMsg.properties.correlationId,
      amqpMsg.properties.messageId,
    );
    if (
      !payload ||
      !this.isNonEmptyString(payload.userId) ||
      !this.isNonEmptyString(payload.email) ||
      !this.isNonEmptyString(payload.nickname) ||
      !this.isNonEmptyString(payload.resetToken) ||
      !this.isValidDateString(payload.expiresAt)
    ) {
      this.logger.warn(`Dropping malformed [${AUTH_ROUTINGKEYS.PASSWORD_RESET_REQUESTED}] event`, {
        correlationId,
      });
      return new Nack(false);
    }

    try {
      await runWithCorrelationId(correlationId, async () => {
        this.logger.log(
          `Processing password reset email for ${payload.email} [Retry: ${retryCount}]`,
          { correlationId },
        );

        await this.commandBus.execute(
          new SendPasswordResetEmailCommand(
            payload.userId,
            payload.email,
            payload.nickname,
            payload.resetToken,
            new Date(payload.expiresAt),
            correlationId,
          ),
        );
      });
    } catch (error) {
      if (retryCount < RETRY_OPTIONS.MAX_RETRIES) {
        this.logger.warn(
          `Failure handling [${AUTH_ROUTINGKEYS.PASSWORD_RESET_REQUESTED}] for ${payload.email}. ` +
            `Retrying (${retryCount + 1}/${RETRY_OPTIONS.MAX_RETRIES})...`,
          String(error),
        );
        await this.notificationPublisher.republishWithDelay(
          AUTH_ROUTINGKEYS.PASSWORD_RESET_REQUESTED,
          data,
          retryCount + 1,
        );
        return;
      }

      this.logger.error(
        `MAX RETRIES EXCEEDED for [${AUTH_ROUTINGKEYS.PASSWORD_RESET_REQUESTED}] [${payload.email}]`,
        String(error),
      );
      return new Nack(false);
    }
  }

  // ─── auth.otp.generated ───────────────────────────────────────
  @RabbitSubscribe({
    exchange: EXCHANGES.AUTH,
    routingKey: AUTH_ROUTINGKEYS.OTP_GENERATED,
    queue: QUEUES.NOTIFICATION_EMAIL_OTP,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleOtpGenerated(
    data: EventEnvelope<{
      email: string;
      otp: string;
      purpose: string;
      expiresAt: string;
    }>,
    amqpMsg: ConsumeMessage,
  ): Promise<void | Nack> {
    const headers = amqpMsg.properties.headers ?? {};
    const retryCount: number = headers['x-retry-count'] ?? 0;
    const payload = this.getPayload(data);
    const correlationId = ensureCorrelationId(
      data.correlationId,
      headers[CORRELATION_ID_HEADER],
      headers['x-original-correlation-id'],
      amqpMsg.properties.correlationId,
      amqpMsg.properties.messageId,
    );
    if (!payload?.email || !payload.otp || !payload.expiresAt) {
      this.logger.warn(`Dropping malformed [${AUTH_ROUTINGKEYS.OTP_GENERATED}] event`, {
        correlationId,
      });
      return new Nack(false);
    }

    try {
      await runWithCorrelationId(correlationId, async () => {
        this.logger.log(`Processing OTP email for ${payload.email} [Retry: ${retryCount}]`, {
          correlationId,
        });

        await this.commandBus.execute(
          new SendOtpEmailCommand(
            payload.email,
            payload.otp,
            payload.purpose,
            new Date(payload.expiresAt),
            correlationId,
          ),
        );
      });
    } catch (error) {
      if (retryCount < RETRY_OPTIONS.MAX_RETRIES) {
        this.logger.warn(
          `Failure handling [${AUTH_ROUTINGKEYS.OTP_GENERATED}] for ${payload.email}. ` +
            `Retrying (${retryCount + 1}/${RETRY_OPTIONS.MAX_RETRIES})...`,
          String(error),
        );
        await this.notificationPublisher.republishWithDelay(
          AUTH_ROUTINGKEYS.OTP_GENERATED,
          data,
          retryCount + 1,
        );
        return;
      }

      this.logger.error(
        `MAX RETRIES EXCEEDED for [${AUTH_ROUTINGKEYS.OTP_GENERATED}] [${payload.email}]`,
        String(error),
      );
      return new Nack(false);
    }
  }

  // ─── recommendation.model.trained ────────────────────────────────────
  @RabbitSubscribe({
    exchange: EXCHANGES.NOTIFICATION,
    routingKey: RECOMMENDATION_ROUTINGKEYS.MODEL_TRAINED,
    queue: QUEUES.NOTIFICATION_MODEL_TRAINED,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleModelTrained(
    data: EventEnvelope<ModelTrainedPayload>,
    amqpMsg: ConsumeMessage,
  ): Promise<void | Nack> {
    const headers = amqpMsg.properties.headers ?? {};
    const retryCount: number = headers['x-retry-count'] ?? 0;
    const payload = this.getPayload(data);
    const correlationId = ensureCorrelationId(
      data.correlationId,
      headers[CORRELATION_ID_HEADER],
      headers['x-original-correlation-id'],
      amqpMsg.properties.correlationId,
      amqpMsg.properties.messageId,
    );
    if (!this.isModelTrainedPayload(payload)) {
      this.logger.warn(`Dropping malformed [${RECOMMENDATION_ROUTINGKEYS.MODEL_TRAINED}] event`, {
        correlationId,
      });
      return new Nack(false);
    }

    try {
      await runWithCorrelationId(correlationId, async () => {
        this.logger.log(
          `Processing model training notification [${payload.status}] [Retry: ${retryCount}]`,
          { correlationId },
        );

        const p = payload;
        await this.commandBus.execute(
          new SendModelTrainedEmailCommand(
            p.email,
            p.status,
            p.version,
            p.timestamp,
            p.epochs,
            p.fineTuneRounds,
            p.totalPairs,
            p.positivePairs,
            p.finalLoss,
            p.finalAccuracy,
            p.valLoss,
            p.valAccuracy,
            p.vocabSizes,
            p.evalBaseline,
            p.evalFinal,
            p.reason,
            p.threshold,
            correlationId,
          ),
        );
      });
    } catch (error) {
      if (retryCount < RETRY_OPTIONS.MAX_RETRIES) {
        this.logger.warn(
          `Failure handling model trained notification. ` +
            `Retrying (${retryCount + 1}/${RETRY_OPTIONS.MAX_RETRIES})...`,
          String(error),
        );
        await this.notificationPublisher.republishWithDelay(
          RECOMMENDATION_ROUTINGKEYS.MODEL_TRAINED,
          data,
          retryCount + 1,
        );
        return;
      }

      this.logger.error(`MAX RETRIES EXCEEDED for model trained notification`, String(error));
      return new Nack(false);
    }
  }
}
