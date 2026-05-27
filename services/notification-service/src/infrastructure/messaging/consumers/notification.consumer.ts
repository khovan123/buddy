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

type EventEnvelope<T extends object> = {
  payload?: T;
  correlationId?: string;
} & Partial<T>;

/** RabbitMQ consumer for auth-related notification events. */
@Controller()
export class NotificationConsumer {
  private readonly logger = new AppLogger(NotificationConsumer.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly notificationPublisher: NotificationEventPublisher,
  ) {}

  private getPayload<T extends object>(data: EventEnvelope<T>): T | undefined {
    return data.payload ?? (data as T);
  }

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
    if (!payload?.email || !payload.userId) {
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
    queue: QUEUES.NOTIFICATION_EMAIL,
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
    if (!payload?.email || !payload.resetToken || !payload.expiresAt) {
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
    queue: QUEUES.NOTIFICATION_EMAIL,
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
    data: EventEnvelope<{
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
    if (!payload?.email || !payload.status) {
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
