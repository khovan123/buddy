import {
  AppLogger,
  CORRELATION_ID_HEADER,
  EXCHANGES,
  QUEUES,
  RETRY_OPTIONS,
  ensureCorrelationId,
  runWithCorrelationId,
} from '@libs/common';
import { AUTH_ROUTINGKEYS, RECOMMENDATION_ROUTINGKEYS } from '@libs/contracts';
import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';
import type { ConsumeMessage } from 'amqplib';
import { SendPasswordResetEmailCommand } from '../../../application/commands/send-password-reset-email.command';
import { SendWelcomeEmailCommand } from '../../../application/commands/send-welcome-email.command';
import { NotificationEventPublisher } from '../publishers/notification-event.publisher';
import { SendOtpEmailCommand } from '../../../application/commands/send-otp-email.command';
import { SendModelTrainedEmailCommand } from '../../../application/commands/send-model-trained-email.command';

/** RabbitMQ consumer for auth-related notification events. */
@Controller()
export class NotificationConsumer {
  private readonly logger = new AppLogger(NotificationConsumer.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly notificationPublisher: NotificationEventPublisher,
  ) {}

  // ─── auth.user.registered ─────────────────────────────────────────────────
  @RabbitSubscribe({
    exchange: EXCHANGES.AUTH,
    routingKey: AUTH_ROUTINGKEYS.USER_REGISTERED,
    queue: QUEUES.NOTIFICATION_EMAIL,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleUserRegistered(
    data: {
      payload: { userId: string; email: string; nickname: string };
      correlationId?: string;
    },
    amqpMsg: ConsumeMessage,
  ): Promise<void | Nack> {
    const headers = amqpMsg.properties.headers ?? {};
    const retryCount: number = headers['x-retry-count'] ?? 0;
    const correlationId = ensureCorrelationId(
      data.correlationId,
      headers[CORRELATION_ID_HEADER],
      headers['x-original-correlation-id'],
      amqpMsg.properties.correlationId,
      amqpMsg.properties.messageId,
    );
    try {
      await runWithCorrelationId(correlationId, async () => {
        this.logger.log(
          `Processing welcome email for ${data.payload.email} [Retry: ${retryCount}]`,
          { correlationId },
        );

        await this.commandBus.execute(
          new SendWelcomeEmailCommand(
            data.payload.userId,
            data.payload.email,
            data.payload.nickname,
            correlationId,
          ),
        );
      });
    } catch (error) {
      if (retryCount < RETRY_OPTIONS.MAX_RETRIES) {
        this.logger.warn(
          `Failure handling [${AUTH_ROUTINGKEYS.USER_REGISTERED}] for ${data.payload.email}. ` +
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
        `MAX RETRIES EXCEEDED for [${AUTH_ROUTINGKEYS.USER_REGISTERED}] [${data.payload.email}]`,
        String(error),
      );
      return new Nack(false); // → dead.letter exchange
    }
  }

  // ─── auth.password.reset.requested ───────────────────────────────────────
  @RabbitSubscribe({
    exchange: EXCHANGES.AUTH,
    routingKey: AUTH_ROUTINGKEYS.PASSWORD_RESET_REQUESTED,
    queue: QUEUES.NOTIFICATION_EMAIL,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handlePasswordResetRequested(
    data: {
      payload: {
        userId: string;
        email: string;
        nickname: string;
        resetToken: string;
        expiresAt: string;
      };
      correlationId?: string;
    },
    amqpMsg: ConsumeMessage,
  ): Promise<void | Nack> {
    const headers = amqpMsg.properties.headers ?? {};
    const retryCount: number = headers['x-retry-count'] ?? 0;
    const correlationId = ensureCorrelationId(
      data.correlationId,
      headers[CORRELATION_ID_HEADER],
      headers['x-original-correlation-id'],
      amqpMsg.properties.correlationId,
      amqpMsg.properties.messageId,
    );

    try {
      await runWithCorrelationId(correlationId, async () => {
        this.logger.log(
          `Processing password reset email for ${data.payload.email} [Retry: ${retryCount}]`,
          { correlationId },
        );

        await this.commandBus.execute(
          new SendPasswordResetEmailCommand(
            data.payload.userId,
            data.payload.email,
            data.payload.nickname,
            data.payload.resetToken,
            new Date(data.payload.expiresAt),
            correlationId,
          ),
        );
      });
    } catch (error) {
      if (retryCount < RETRY_OPTIONS.MAX_RETRIES) {
        this.logger.warn(
          `Failure handling [${AUTH_ROUTINGKEYS.PASSWORD_RESET_REQUESTED}] for ${data.payload.email}. ` +
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
        `MAX RETRIES EXCEEDED for [${AUTH_ROUTINGKEYS.PASSWORD_RESET_REQUESTED}] [${data.payload.email}]`,
        String(error),
      );
      return new Nack(false);
    }
  }

  // ─── auth.otp.generated ───────────────────────────────────────
  @RabbitSubscribe({
    exchange: EXCHANGES.AUTH,
    routingKey: AUTH_ROUTINGKEYS.OTP_GENERATED,
    queue: QUEUES.NOTIFICATION_EMAIL,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleOtpGenerated(
    data: {
      payload: {
        email: string;
        otp: string;
        purpose: string;
        expiresAt: string;
      };
      correlationId?: string;
    },
    amqpMsg: ConsumeMessage,
  ): Promise<void | Nack> {
    const headers = amqpMsg.properties.headers ?? {};
    const retryCount: number = headers['x-retry-count'] ?? 0;
    const correlationId = ensureCorrelationId(
      data.correlationId,
      headers[CORRELATION_ID_HEADER],
      headers['x-original-correlation-id'],
      amqpMsg.properties.correlationId,
      amqpMsg.properties.messageId,
    );

    try {
      await runWithCorrelationId(correlationId, async () => {
        this.logger.log(`Processing OTP email for ${data.payload.email} [Retry: ${retryCount}]`, {
          correlationId,
        });

        await this.commandBus.execute(
          new SendOtpEmailCommand(
            data.payload.email,
            data.payload.otp,
            data.payload.purpose,
            new Date(data.payload.expiresAt),
            correlationId,
          ),
        );
      });
    } catch (error) {
      if (retryCount < RETRY_OPTIONS.MAX_RETRIES) {
        this.logger.warn(
          `Failure handling [${AUTH_ROUTINGKEYS.OTP_GENERATED}] for ${data.payload.email}. ` +
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
        `MAX RETRIES EXCEEDED for [${AUTH_ROUTINGKEYS.OTP_GENERATED}] [${data.payload.email}]`,
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
    data: {
      payload: {
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
      correlationId?: string;
    },
    amqpMsg: ConsumeMessage,
  ): Promise<void | Nack> {
    const headers = amqpMsg.properties.headers ?? {};
    const retryCount: number = headers['x-retry-count'] ?? 0;
    const correlationId = ensureCorrelationId(
      data.correlationId,
      headers[CORRELATION_ID_HEADER],
      headers['x-original-correlation-id'],
      amqpMsg.properties.correlationId,
      amqpMsg.properties.messageId,
    );

    try {
      await runWithCorrelationId(correlationId, async () => {
        this.logger.log(
          `Processing model training notification [${data.payload.status}] [Retry: ${retryCount}]`,
          { correlationId },
        );

        const p = data.payload;
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
