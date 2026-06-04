import { BaseEvent } from './base.event';
import type { SubscriptionPlanDetails } from '../dtos/subscription.types';

export const BILLING_ROUTINGKEYS = {
  WALLET_TOPPED_UP: 'BILLING_WALLET_TOPPED_UP',
  PURCHASE_COMPLETED: 'BILLING_PURCHASE_COMPLETED',
  WITHDRAW_REQUESTED: 'BILLING_WITHDRAW_REQUESTED',
  WITHDRAW_COMPLETED: 'BILLING_WITHDRAW_COMPLETED',
  SUBSCRIPTION_CHANGED: 'BILLING_SUBSCRIPTION_CHANGED',
  GET_SUBSCRIPTION_PLAN: 'BILLING_GET_SUBSCRIPTION_PLAN',
} as const;

export type BillingSubscriptionPlanRpcResponse = {
  subscription: {
    plan?: string | null;
  } | null;
  planDetails: SubscriptionPlanDetails | null;
};

export type PurchasedItemType =
  | 'RESOURCE'
  | 'TUTORIAL'
  | 'RESOURCE_COLLECTION'
  | 'TUTORIAL_COLLECTION'
  | 'TUTORIAL_BUNDLE'
  | 'TUTORIAL_BUNDLE_COLLECTION';

export type PurchasedItemPayload = {
  itemId: string;
  itemType: PurchasedItemType;
  resourceIds?: string[];
  tutorialId?: string;
  tutorialIds?: string[];
};

/** Represents the  wallet topped up event component. */
export class WalletToppedUpEvent extends BaseEvent {
  get routingKey(): string {
    return BILLING_ROUTINGKEYS.WALLET_TOPPED_UP;
  }

  constructor(
    public readonly payload: {
      transactionId: string;
      userId: string;
      walletId: string;
      amount: string;
      provider: 'SEPAY';
      toppedUpAt: string;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Represents the  purchase completed event component. */
export class PurchaseCompletedEvent extends BaseEvent {
  get routingKey(): string {
    return BILLING_ROUTINGKEYS.PURCHASE_COMPLETED;
  }

  constructor(
    public readonly payload: {
      purchaseId: string;
      buyerId: string;
      sellerId: string;
      amount: string;
      purchasedAt: string;
      items: PurchasedItemPayload[];
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Represents the withdraw requested event component. */
export class WithdrawRequestedEvent extends BaseEvent {
  get routingKey(): string {
    return BILLING_ROUTINGKEYS.WITHDRAW_REQUESTED;
  }

  constructor(
    public readonly payload: {
      transactionId: string;
      userId: string;
      amount: string;
      bankAccountNumber?: string;
      bankName?: string;
      provider: 'SEPAY' | 'BANK_TRANSFER';
      requestedAt: string;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Represents the withdraw completed event component. */
export class WithdrawCompletedEvent extends BaseEvent {
  get routingKey(): string {
    return BILLING_ROUTINGKEYS.WITHDRAW_COMPLETED;
  }

  constructor(
    public readonly payload: {
      transactionId: string;
      userId: string;
      amount: string;
      provider: 'SEPAY' | 'BANK_TRANSFER';
      completedAt: string;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Emitted when a user's subscription plan changes (upgrade, downgrade, cancel). */
export class SubscriptionChangedEvent extends BaseEvent {
  get routingKey(): string {
    return BILLING_ROUTINGKEYS.SUBSCRIPTION_CHANGED;
  }

  constructor(
    public readonly payload: {
      userId: string;
      plan: string;
      previousPlan: string | null;
      changedAt: string;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

export class GetBillingSubscriptionPlanEvent extends BaseEvent {
  get routingKey(): string {
    return BILLING_ROUTINGKEYS.GET_SUBSCRIPTION_PLAN;
  }

  constructor(
    public readonly payload: {
      userId: string;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}
