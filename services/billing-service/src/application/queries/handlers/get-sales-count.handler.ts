import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { WALLET_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IWalletRepository } from '../../../domain/repositories/wallet.repository.interface';
import { GetSalesCountQuery } from '../get-sales-count.query';

/** CQRS Handler to execute get sales count. */
@QueryHandler(GetSalesCountQuery)
export class GetSalesCountHandler implements IQueryHandler<GetSalesCountQuery> {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
  ) {}

  async execute(query: GetSalesCountQuery): Promise<number> {
    return this.walletRepository.countSuccessfulSales(query.sellerId);
  }
}
