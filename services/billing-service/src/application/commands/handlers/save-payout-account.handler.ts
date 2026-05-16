import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { IPayoutGateway } from '../../../domain/repositories/payout-gateway.interface';
import { PAYOUT_GATEWAY, WALLET_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IWalletRepository } from '../../../domain/repositories/wallet.repository.interface';
import { SavePayoutAccountCommand } from '../save-payout-account.command';

@CommandHandler(SavePayoutAccountCommand)
export class SavePayoutAccountHandler implements ICommandHandler<SavePayoutAccountCommand> {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
    @Inject(PAYOUT_GATEWAY)
    private readonly payoutGateway: IPayoutGateway,
  ) {}

  async execute(command: SavePayoutAccountCommand) {
    // Re-verify the bank account before saving to prevent storing unverified data
    const verification = await this.payoutGateway.verifyBankAccount({
      bankBin: command.bankBin,
      accountNumber: command.bankAccountNumber,
    });

    if (!verification.valid) {
      throw new BadRequestException(
        'Bank account verification failed. Please verify your bank details first.',
      );
    }

    return this.walletRepository.upsertPayoutAccount({
      userId: command.userId,
      bankBin: command.bankBin,
      bankAccountNumber: command.bankAccountNumber,
      bankAccountName: command.bankAccountName,
      bankName: command.bankName,
      verified: true,
      verifiedAt: new Date(),
    });
  }
}
