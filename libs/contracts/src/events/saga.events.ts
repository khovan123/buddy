import { BaseEvent } from './base.event';
import type { PurchasedItemPayload } from './billing.events';

// ─── Saga Compensation Routing Keys ───────────────────────────────────────────
export const SAGA_ROUTINGKEYS = {
  /** Emitted by content-access-service when granting access fails after purchase. */
  ACCESS_GRANT_FAILED: 'saga.access_grant_failed',
  /** Emitted by billing-service when refund completes as compensation. */
  PURCHASE_REFUNDED: 'saga.purchase_refunded',
  /** Emitted by upload-service / content-service when video processing permanently fails. */
  VIDEO_PROCESSING_COMPENSATION: 'saga.video_processing_compensation',
} as const;

// ─── Purchase Saga: Compensation Events ────────────────────────────────────────

/**
 * Emitted by content-access-service when it fails to grant access
 * after a PURCHASE_COMPLETED event. Triggers wallet refund in billing-service.
 */
export class AccessGrantFailedEvent extends BaseEvent {
  get routingKey(): string {
    return SAGA_ROUTINGKEYS.ACCESS_GRANT_FAILED;
  }

  constructor(
    public readonly payload: {
      /** The original purchase ID that was completed. */
      purchaseId: string;
      /** Buyer's user ID to refund. */
      buyerId: string;
      /** Seller who received the credit. */
      sellerId: string;
      /** Amount to refund (string to preserve decimal precision). */
      amount: string;
      /** Items that failed to be granted. */
      items: PurchasedItemPayload[];
      /** Reason for failure. */
      reason: string;
      /** Timestamp of the failure. */
      failedAt: string;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/**
 * Emitted by billing-service after a successful compensation refund.
 * This is the final event in the purchase saga compensation flow.
 */
export class PurchaseRefundedEvent extends BaseEvent {
  get routingKey(): string {
    return SAGA_ROUTINGKEYS.PURCHASE_REFUNDED;
  }

  constructor(
    public readonly payload: {
      purchaseId: string;
      buyerId: string;
      amount: string;
      refundedAt: string;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

// ─── Upload Saga: Compensation Events ──────────────────────────────────────────

/**
 * Emitted when video processing permanently fails (after all retries exhausted)
 * to trigger content-service to revert the tutorial/resource status.
 */
export class VideoProcessingCompensationEvent extends BaseEvent {
  get routingKey(): string {
    return SAGA_ROUTINGKEYS.VIDEO_PROCESSING_COMPENSATION;
  }

  constructor(
    public readonly payload: {
      /** The fileId that failed processing. */
      fileId: string;
      /** User who uploaded the file. */
      uploadedBy: string;
      /** Type of content ('tutorial' | 'resource'). */
      contentType: 'tutorial' | 'resource';
      /** Reason for permanent failure. */
      reason: string;
      /** Timestamp of the final failure. */
      failedAt: string;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}
