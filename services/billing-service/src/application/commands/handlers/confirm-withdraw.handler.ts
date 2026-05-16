import { BILLING_ROUTINGKEYS, WithdrawCompletedEvent } from '@libs/contracts';
import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { WALLET_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IWalletRepository } from '../../../domain/repositories/wallet.repository.interface';
import { ConfirmWithdrawCommand } from '../confirm-withdraw.command';

@CommandHandler(ConfirmWithdrawCommand)
export class ConfirmWithdrawHandler implements ICommandHandler<ConfirmWithdrawCommand> {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
  ) {}

  async execute(
    command: ConfirmWithdrawCommand,
  ): Promise<{ transactionId: string; userId: string }> {
    // Fetch the actual transaction to populate event with real data
    const transaction = await this.walletRepository.findTransactionById(command.transactionId);
    if (!transaction) {
      throw new NotFoundException(`Withdraw transaction ${command.transactionId} not found`);
    }

    const event = new WithdrawCompletedEvent(
      {
        transactionId: command.transactionId,
        userId: (transaction.metadata?.userId as string) ?? '',
        amount: transaction.amountInCents,
        provider: (transaction.provider as 'PAYOS' | 'PAYPAL' | 'BANK_TRANSFER') ?? 'BANK_TRANSFER',
        completedAt: new Date().toISOString(),
      },
      command.correlationId,
    );

    return this.walletRepository.confirmWithdrawAndInsertOutbox({
      transactionId: command.transactionId,
      eventType: BILLING_ROUTINGKEYS.WITHDRAW_COMPLETED,
      eventPayload: {
        eventId: event.eventId,
        routingKey: event.routingKey,
        version: event.version,
        occurredAt: event.occurredAt,
        correlationId: event.correlationId,
        causationId: event.causationId,
        payload: event.payload,
      },
      correlationId: command.correlationId,
    });
  }
}
