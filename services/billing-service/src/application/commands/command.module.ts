import { ConfirmSePayDepositWebhookHandler } from './handlers/confirm-sepay-deposit-webhook.handler';
import { ConfirmSePayWithdrawWebhookHandler } from './handlers/confirm-sepay-withdraw-webhook.handler';
import { ConfirmTopUpHandler } from './handlers/confirm-top-up.handler';
import { ConfirmWithdrawHandler } from './handlers/confirm-withdraw.handler';
import { CreateSubscriptionHandler } from './handlers/create-subscription.handler';
import { ProcessPurchaseHandler } from './handlers/process-purchase.handler';
import { SavePayoutAccountHandler } from './handlers/save-payout-account.handler';
import { TopUpWalletHandler } from './handlers/top-up-wallet.handler';
import { VerifyBankAccountHandler } from './handlers/verify-bank-account.handler';
import { WithdrawWalletHandler } from './handlers/withdraw-wallet.handler';

export const COMMAND_HANDLERS = [
  TopUpWalletHandler,
  ConfirmTopUpHandler,
  ConfirmSePayDepositWebhookHandler,
  ConfirmSePayWithdrawWebhookHandler,
  ProcessPurchaseHandler,
  WithdrawWalletHandler,
  ConfirmWithdrawHandler,
  VerifyBankAccountHandler,
  SavePayoutAccountHandler,
  CreateSubscriptionHandler,
];
