import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { WALLET_REPOSITORY } from '../../../domain/repositories/tokens';
import type {
  IWalletRepository,
  PayoutAccountRecord,
} from '../../../domain/repositories/wallet.repository.interface';
import { GetPayoutAccountQuery } from '../get-payout-account.query';

@QueryHandler(GetPayoutAccountQuery)
export class GetPayoutAccountHandler implements IQueryHandler<GetPayoutAccountQuery> {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
  ) {}

  async execute(query: GetPayoutAccountQuery): Promise<PayoutAccountRecord | null> {
    return this.walletRepository.findPayoutAccountByUserId(query.userId);
  }
}
