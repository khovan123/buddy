import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { WALLET_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IWalletRepository } from '../../../domain/repositories/wallet.repository.interface';
import { GetTransactionHistoryQuery } from '../get-transaction-history.query';

/** CQRS Handler to execute get transaction history. */
@QueryHandler(GetTransactionHistoryQuery)
export class GetTransactionHistoryHandler implements IQueryHandler<GetTransactionHistoryQuery> {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
  ) {}

  async execute(query: GetTransactionHistoryQuery) {
    return this.walletRepository.findTransactionsByUserId(query.userId, query.page, query.limit);
  }
}
