import { BILLING_ROUTINGKEYS } from '@libs/contracts';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { IWalletRepository } from '../../../domain/repositories/wallet.repository.interface';
import { WALLET_REPOSITORY } from '../../../domain/repositories/tokens';
import { CreateSubscriptionCommand } from '../create-subscription.command';

@CommandHandler(CreateSubscriptionCommand)
export class CreateSubscriptionHandler implements ICommandHandler<CreateSubscriptionCommand> {
  private readonly logger = new Logger(CreateSubscriptionHandler.name);

  constructor(@Inject(WALLET_REPOSITORY) private readonly walletRepo: IWalletRepository) {}

  async execute(command: CreateSubscriptionCommand) {
    const result = await this.walletRepo.activateSubscriptionWithWalletDebitAndInsertOutbox({
      userId: command.userId,
      plan: command.plan,
      correlationId: command.correlationId,
      eventType: BILLING_ROUTINGKEYS.SUBSCRIPTION_CHANGED,
    });

    this.logger.log(
      `Subscription ${result.previousPlan ? 'changed' : 'created'}: ${result.previousPlan} → ${command.plan} for user ${command.userId}`,
    );

    return result.subscription;
  }
}
