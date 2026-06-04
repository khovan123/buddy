import { EXCHANGES, OUTBOX_EVENTS } from '@libs/common';
import { BILLING_ROUTINGKEYS } from '@libs/contracts';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { IWalletRepository } from '../../../domain/repositories/wallet.repository.interface';
import { WALLET_REPOSITORY } from '../../../domain/repositories/tokens';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { CreateSubscriptionCommand } from '../create-subscription.command';

@CommandHandler(CreateSubscriptionCommand)
export class CreateSubscriptionHandler implements ICommandHandler<CreateSubscriptionCommand> {
  private readonly logger = new Logger(CreateSubscriptionHandler.name);

  constructor(
    @Inject(WALLET_REPOSITORY) private readonly walletRepo: IWalletRepository,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CreateSubscriptionCommand) {
    // 1. Read existing subscription to detect plan change
    const existing = await this.walletRepo.findActiveSubscription(command.userId);
    const previousPlan = existing?.plan ?? null;

    // 2. Upsert subscription
    const subscription = await this.walletRepo.upsertSubscription({
      userId: command.userId,
      plan: command.plan,
    });

    // 3. Insert outbox event for SUBSCRIPTION_CHANGED so auth-service can sync the plan
    const eventPayload = {
      userId: command.userId,
      plan: command.plan,
      previousPlan,
      changedAt: new Date().toISOString(),
    };

    await this.prisma.client.outbox.create({
      data: {
        correlationId: command.correlationId,
        type: BILLING_ROUTINGKEYS.SUBSCRIPTION_CHANGED,
        payload: eventPayload,
        exchange: EXCHANGES.BILLING,
        routingKey: BILLING_ROUTINGKEYS.SUBSCRIPTION_CHANGED,
      },
    });

    await this.eventEmitter.emitAsync(OUTBOX_EVENTS.FLUSHED, {
      correlationId: command.correlationId,
    });

    this.logger.log(
      `Subscription ${previousPlan ? 'changed' : 'created'}: ${previousPlan} → ${command.plan} for user ${command.userId}`,
    );

    return subscription;
  }
}
