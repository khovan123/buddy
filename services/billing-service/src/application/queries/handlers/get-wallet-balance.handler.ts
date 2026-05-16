import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { WALLET_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IWalletRepository } from '../../../domain/repositories/wallet.repository.interface';
import { GetWalletBalanceQuery } from '../get-wallet-balance.query';

/** CQRS Handler to execute get wallet balance. */
@QueryHandler(GetWalletBalanceQuery)
export class GetWalletBalanceHandler implements IQueryHandler<GetWalletBalanceQuery> {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
  ) {}

  async execute(query: GetWalletBalanceQuery) {
    const wallet = await this.walletRepository.getOrCreateWalletByUserId(query.userId);

    return {
      walletId: wallet.id,
      userId: wallet.userId,
      balanceInCents: wallet.balanceInCents.toString(),
    };
  }
}
