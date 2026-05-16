import { GetPayoutAccountHandler } from './handlers/get-payout-account.handler';
import { GetSalesCountHandler } from './handlers/get-sales-count.handler';
import { GetSubscriptionHandler } from './handlers/get-subscription.handler';
import { GetTransactionHistoryHandler } from './handlers/get-transaction-history.handler';
import { GetWalletBalanceHandler } from './handlers/get-wallet-balance.handler';

export const QUERY_HANDLERS = [
  GetWalletBalanceHandler,
  GetTransactionHistoryHandler,
  GetPayoutAccountHandler,
  GetSubscriptionHandler,
  GetSalesCountHandler,
];
