import { BaseEvent } from './base.event';
import type { PurchasedItemPayload } from './billing.events';

export const CONTENT_ROUTINGKEYS = {
  VALIDATE_CONTENT_STATUS: 'CONTENT_VALIDATE_STATUS',
  GET_PURCHASE_CATALOG: 'CONTENT_GET_PURCHASE_CATALOG',
} as const;

export type ContentValidationItemType =
  | 'RESOURCE'
  | 'TUTORIAL'
  | 'RESOURCE_COLLECTION'
  | 'TUTORIAL_COLLECTION'
  | 'TUTORIAL_BUNDLE'
  | 'TUTORIAL_BUNDLE_COLLECTION';

export type ContentPurchaseCatalogItemType = ContentValidationItemType;

export type PurchaseCatalogResponse = {
  sellerId: string;
  priceInCents: string;
  items: PurchasedItemPayload[];
};

/** Represents the  validate content status event component. */
export class ValidateContentStatusEvent extends BaseEvent {
  get routingKey(): string {
    return CONTENT_ROUTINGKEYS.VALIDATE_CONTENT_STATUS;
  }

  constructor(
    public readonly payload: {
      itemId: string;
      itemType: ContentValidationItemType;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Represents the  get purchase catalog event component. */
export class GetPurchaseCatalogEvent extends BaseEvent {
  get routingKey(): string {
    return CONTENT_ROUTINGKEYS.GET_PURCHASE_CATALOG;
  }

  constructor(
    public readonly payload: {
      itemId: string;
      itemType: ContentPurchaseCatalogItemType;
      userId: string;
      ownedResourceIds?: string[];
      ownedTutorialIds?: string[];
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}
