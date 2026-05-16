import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { IPayoutGateway } from '../../../domain/repositories/payout-gateway.interface';
import { PAYOUT_GATEWAY } from '../../../domain/repositories/tokens';
import { VerifyBankAccountCommand } from '../verify-bank-account.command';

@CommandHandler(VerifyBankAccountCommand)
export class VerifyBankAccountHandler implements ICommandHandler<VerifyBankAccountCommand> {
  constructor(
    @Inject(PAYOUT_GATEWAY)
    private readonly payoutGateway: IPayoutGateway,
  ) {}

  async execute(
    command: VerifyBankAccountCommand,
  ): Promise<{ valid: boolean; accountName: string | null }> {
    return this.payoutGateway.verifyBankAccount({
      bankBin: command.bankBin,
      accountNumber: command.bankAccountNumber,
    });
  }
}
