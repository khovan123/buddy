import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { AppLogger, EXCHANGES, QUEUES } from '@libs/common';
import { AUTH_ROUTINGKEYS, SubscriptionPlan, type UserRegisteredEvent } from '@libs/contracts';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma/prisma.service';

type UserRegisteredPayload = UserRegisteredEvent['payload'];
type UserRegisteredMessage =
  | UserRegisteredEvent
  | UserRegisteredPayload
  | {
      correlationId?: string;
      payload?: UserRegisteredPayload;
    };

@Injectable()
export class UserRegisteredConsumer {
  private readonly logger = new AppLogger(UserRegisteredConsumer.name);

  constructor(private readonly prisma: PrismaService) {}

  @RabbitSubscribe({
    exchange: EXCHANGES.AUTH,
    routingKey: AUTH_ROUTINGKEYS.USER_REGISTERED,
    queue: QUEUES.BILLING_AUTH_USER_REGISTERED_EVENTS,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleUserRegistered(event: UserRegisteredMessage): Promise<void | Nack> {
    const payload = this.extractPayload(event);

    if (!this.isValidPayload(payload)) {
      this.logger.warn(`Dropping malformed [${AUTH_ROUTINGKEYS.USER_REGISTERED}] event`);
      return new Nack(false);
    }

    try {
      await this.createDefaultSubscription(payload.userId);
      this.logger.log(`Ensured default subscription for user ${payload.userId}`, {
        plan: SubscriptionPlan.STUDENT_FREE,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        this.logger.log(`Subscription already exists for user ${payload.userId}`);
        return;
      }

      this.logger.error(
        `Failed to create default subscription for user ${payload.userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      return new Nack(true);
    }
  }

  private async createDefaultSubscription(userId: string): Promise<void> {
    const existing = await this.prisma.client.subscription.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (existing) {
      return;
    }

    await this.prisma.client.subscription.create({
      data: {
        userId,
        plan: SubscriptionPlan.STUDENT_FREE,
        status: 'ACTIVE',
      },
    });
  }

  private extractPayload(event: UserRegisteredMessage): UserRegisteredPayload | undefined {
    if (this.isEnvelope(event)) {
      return event.payload;
    }

    return this.isRawPayload(event) ? event : undefined;
  }

  private isEnvelope(
    event: UserRegisteredMessage,
  ): event is Extract<UserRegisteredMessage, { payload?: UserRegisteredPayload }> {
    return 'payload' in event;
  }

  private isRawPayload(event: UserRegisteredMessage): event is UserRegisteredPayload {
    return 'userId' in event && 'email' in event;
  }

  private isValidPayload(
    payload: UserRegisteredPayload | undefined,
  ): payload is UserRegisteredPayload {
    return Boolean(
      payload &&
      typeof payload.userId === 'string' &&
      payload.userId.trim().length > 0 &&
      typeof payload.email === 'string' &&
      payload.email.trim().length > 0,
    );
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return Boolean(
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2002',
    );
  }
}
