import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import {
  AppLogger,
  CORRELATION_ID_HEADER,
  EXCHANGES,
  QUEUES,
  ensureCorrelationId,
  runWithCorrelationId,
} from '@libs/common';
import { AUTH_ROUTINGKEYS } from '@libs/contracts';
import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type { ConsumeMessage } from 'amqplib';
import { CreateUserProfileCommand } from '../../../application/commands/create-user-profile.command';

/** Interface representing data constraints for  user registered payload. */
interface UserRegisteredPayload {
  payload: {
    userId: string;
    email: string;
    username?: string;
    nickname: string;
    registeredAt: string;
  };
  correlationId?: string;
}

/** Represents the  user event consumer component. */
@Controller()
export class UserEventConsumer {
  private readonly logger = new AppLogger(UserEventConsumer.name);

  constructor(private readonly commandBus: CommandBus) {}

  /**
   * Consumed when auth-service publishes a UserRegisteredEvent.
   * Creates the user profile in the user-service's MongoDB.
   * Pattern: idempotent — safe to receive duplicate messages.
   */
  @RabbitSubscribe({
    exchange: EXCHANGES.AUTH,
    routingKey: AUTH_ROUTINGKEYS.USER_REGISTERED,
    queue: QUEUES.USER_EVENTS,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async onUserRegistered(
    data: UserRegisteredPayload,
    amqpMsg: ConsumeMessage,
  ): Promise<void | Nack> {
    const headers = (amqpMsg.properties.headers || {}) as Record<string, unknown>;
    const correlationId = ensureCorrelationId(
      data.correlationId,
      headers[CORRELATION_ID_HEADER],
      amqpMsg.properties.correlationId,
      amqpMsg.properties.messageId,
    );

    try {
      await runWithCorrelationId(correlationId, async () => {
        await this.commandBus.execute(
          new CreateUserProfileCommand(
            data.payload.userId,
            data.payload.email,
            data.payload.nickname,
            correlationId,
          ),
        );
      });
    } catch (err) {
      this.logger.error(
        'Failed to create user profile',
        err instanceof Error ? err.stack : String(err),
        { userId: data?.payload?.userId },
      );
      // nack → dead-letter exchange
      return new Nack(false);
    }
  }
}
