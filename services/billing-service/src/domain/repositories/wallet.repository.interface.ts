import { ProductType } from '../../application/commands/process-purchase.command';
import type { PurchasedItemPayload } from '@libs/contracts';
import { Wallet } from '../entities/wallet.entity';

export type PurchaseTransferInput = {
  buyerId: string;
  sellerId: string;
  amountInCents: bigint;
  itemType: ProductType;
  itemId: string;
  purchasedItems: PurchasedItemPayload[];
  correlationId: string;
  eventType: string;
  eventPayload: Record<string, unknown>;
  idempotencyKey?: string;
};

export type SubscriptionActivationInput = {
  userId: string;
  plan: string;
  correlationId: string;
  eventType: string;
};

/** Interface representing data constraints for  i wallet repository. */
export interface IWalletRepository {
  getOrCreateWalletByUserId(userId: string): Promise<Wallet>;

  createPendingTopUp(input: {
    userId: string;
    amountInCents: bigint;
    provider: 'SEPAY';
    externalReference: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ transactionId: string; walletId: string }>;

  confirmTopUpAndInsertOutbox(input: {
    externalReference: string;
    provider: 'SEPAY';
    amountInCents: bigint;
    occurredAt?: Date;
    eventType: string;
    eventPayload: Record<string, unknown>;
    correlationId: string;
  }): Promise<{ transactionId: string; userId: string; walletId: string }>;

  findOwnedResourceIds(userId: string): Promise<Set<string>>;
  findSuccessfulPurchasedItemIds(userId: string, itemType: ProductType): Promise<Set<string>>;
  hasSuccessfulPurchaseOfItem(input: {
    userId: string;
    itemId: string;
    itemType: ProductType;
  }): Promise<boolean>;

  transferForPurchaseAndInsertOutbox(input: PurchaseTransferInput): Promise<{ purchaseId: string }>;

  createPendingWithdraw(input: {
    userId: string;
    amountInCents: bigint;
    provider: 'SEPAY' | 'BANK_TRANSFER';
    metadata?: Record<string, unknown>;
    idempotencyKey?: string;
  }): Promise<{ transactionId: string }>;

  confirmWithdrawAndInsertOutbox(input: {
    transactionId: string;
    eventType: string;
    eventPayload: Record<string, unknown>;
    correlationId: string;
  }): Promise<{ transactionId: string; userId: string }>;

  findByIdempotencyKey(idempotencyKey: string): Promise<{
    transactionId: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    metadata: Record<string, unknown> | null;
  } | null>;

  // ── Creator Stats ──────────────────────────────────────────────────
  countSuccessfulSales(sellerId: string): Promise<number>;

  // ── CQRS Read-side ─────────────────────────────────────────────────
  findTransactionsByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    data: TransactionRecord[];
    total: number;
    page: number;
    limit: number;
  }>;

  findTransactionById(transactionId: string): Promise<TransactionRecord | null>;

  // ── Payout Account ────────────────────────────────────────────────
  upsertPayoutAccount(input: {
    userId: string;
    bankBin: string;
    bankAccountNumber: string;
    bankAccountName: string;
    bankName: string;
    verified: boolean;
    verifiedAt?: Date;
  }): Promise<PayoutAccountRecord>;

  findPayoutAccountByUserId(userId: string): Promise<PayoutAccountRecord | null>;

  // ── Subscription ──────────────────────────────────────────────────
  findActiveSubscription(userId: string): Promise<SubscriptionRecord | null>;
  activateSubscriptionWithWalletDebitAndInsertOutbox(input: SubscriptionActivationInput): Promise<{
    subscription: SubscriptionRecord;
    previousPlan: string | null;
    amountInCents: string;
  }>;
  upsertSubscription(input: {
    userId: string;
    plan: string;
    expiresAt?: Date;
  }): Promise<SubscriptionRecord>;
  cancelSubscription(userId: string): Promise<void>;
}

export type TransactionRecord = {
  id: string;
  type: string;
  status: string;
  provider: string | null;
  amountInCents: string;
  currency: string;
  createdAt: Date;
  confirmedAt: Date | null;
  metadata: Record<string, unknown> | null;
};

export type PayoutAccountRecord = {
  id: string;
  userId: string;
  bankBin: string;
  bankAccountNumber: string;
  bankAccountName: string;
  bankName: string;
  verified: boolean;
  verifiedAt: Date | null;
};

export type SubscriptionRecord = {
  id: string;
  userId: string;
  plan: string;
  status: string;
  startsAt: Date;
  expiresAt: Date | null;
};
