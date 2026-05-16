import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { IPayoutGateway } from '../../../domain/repositories/payout-gateway.interface';
import { PAYOUT_GATEWAY, WALLET_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IWalletRepository } from '../../../domain/repositories/wallet.repository.interface';
import { WithdrawWalletCommand } from '../withdraw-wallet.command';

@CommandHandler(WithdrawWalletCommand)
export class WithdrawWalletHandler implements ICommandHandler<WithdrawWalletCommand> {
  private readonly logger = new Logger(WithdrawWalletHandler.name);

  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
    @Inject(PAYOUT_GATEWAY)
    private readonly payoutGateway: IPayoutGateway,
  ) {}

  async execute(
    command: WithdrawWalletCommand,
  ): Promise<{ transactionId: string; payoutId: string }> {
    // 1. Idempotency check
    if (command.idempotencyKey) {
      const existing = await this.walletRepository.findByIdempotencyKey(command.idempotencyKey);
      if (existing) {
        if (existing.status === 'SUCCESS' || existing.status === 'PENDING') {
          return {
            transactionId: existing.transactionId,
            payoutId: ((existing.metadata as Record<string, unknown>)?.payoutId as string) ?? '',
          };
        }
        if (existing.status === 'FAILED') {
          throw new BadRequestException('Previous attempt with this idempotency key failed');
        }
      }
    }

    // 2. Fetch verified payout account
    const payoutAccount = await this.walletRepository.findPayoutAccountByUserId(command.userId);
    if (!payoutAccount || !payoutAccount.verified) {
      throw new BadRequestException(
        'No verified payout account found. Please set up and verify your bank account first.',
      );
    }

    // 3. Atomically debit wallet + create transaction + insert outbox
    const { transactionId } = await this.walletRepository.createPendingWithdraw({
      userId: command.userId,
      amountInCents: command.amountInCents,
      provider: 'BANK_TRANSFER',
      metadata: {
        bankBin: payoutAccount.bankBin,
        bankAccountNumber: payoutAccount.bankAccountNumber,
        bankAccountName: payoutAccount.bankAccountName,
        bankName: payoutAccount.bankName,
      },
      idempotencyKey: command.idempotencyKey,
    });

    // 5. Create PayOS payout (after DB commit)
    let payoutId = '';
    try {
      const payoutResult = await this.payoutGateway.createPayout({
        referenceId: transactionId,
        amount: Number(command.amountInCents),
        description: 'WITHDRAW',
        toBin: payoutAccount.bankBin,
        toAccountNumber: payoutAccount.bankAccountNumber,
      });
      payoutId = payoutResult.payoutId;
    } catch (error) {
      // PayOS call failed — transaction is still recorded in DB for reconciliation.
      // The outbox event will trigger downstream retry/monitoring.
      this.logger.error(
        `PayOS payout creation failed for transaction ${transactionId}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }

    return { transactionId, payoutId };
  }
}
