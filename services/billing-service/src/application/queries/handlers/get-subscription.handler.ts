import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IWalletRepository } from '../../../domain/repositories/wallet.repository.interface';
import { WALLET_REPOSITORY } from '../../../domain/repositories/tokens';
import { GetSubscriptionQuery } from '../get-subscription.query';

@QueryHandler(GetSubscriptionQuery)
export class GetSubscriptionHandler implements IQueryHandler<GetSubscriptionQuery> {
  constructor(@Inject(WALLET_REPOSITORY) private readonly repo: IWalletRepository) {}

  async execute(query: GetSubscriptionQuery) {
    return this.repo.findActiveSubscription(query.userId);
  }
}
