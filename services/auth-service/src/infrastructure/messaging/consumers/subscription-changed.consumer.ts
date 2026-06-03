import { Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { EXCHANGES, QUEUES } from '@libs/common';
import { BILLING_ROUTINGKEYS, SubscriptionChangedEvent } from '@libs/contracts';
import { Controller, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { UpdateSubscriptionPlanCommand } from '../../../application/commands/update-subscription-plan.command';

type SubscriptionChangedPayload = SubscriptionChangedEvent['payload'];
type SubscriptionChangedMessage =
  | SubscriptionChangedEvent
  | {
      correlationId?: string;
      payload?: SubscriptionChangedPayload;
    };

@Controller()
export class SubscriptionChangedConsumer {
  private readonly logger = new Logger(SubscriptionChangedConsumer.name);

  constructor(private readonly commandBus: CommandBus) {}

  @RabbitSubscribe({
    exchange: EXCHANGES.BILLING,
    routingKey: BILLING_ROUTINGKEYS.SUBSCRIPTION_CHANGED,
    queue: QUEUES.AUTH_COMMANDS,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleSubscriptionChanged(event: SubscriptionChangedMessage): Promise<void | Nack> {
    const payload = event.payload;

    if (!this.isValidPayload(payload)) {
      this.logger.warn(`Dropping malformed [${BILLING_ROUTINGKEYS.SUBSCRIPTION_CHANGED}] event`);
      return new Nack(false);
    }

    const correlationId = event.correlationId ?? payload.userId;

    await this.commandBus.execute(
      new UpdateSubscriptionPlanCommand(payload.userId, payload.plan, correlationId),
    );

    this.logger.log(`Synced subscription plan ${payload.plan} for user ${payload.userId}`);
  }

  private isValidPayload(
    payload: SubscriptionChangedPayload | undefined,
  ): payload is SubscriptionChangedPayload {
    return Boolean(
      payload &&
      typeof payload.userId === 'string' &&
      payload.userId.trim().length > 0 &&
      typeof payload.plan === 'string' &&
      payload.plan.trim().length > 0,
    );
  }
}
