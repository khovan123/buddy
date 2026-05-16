export type ProductType =
  | 'RESOURCE'
  | 'TUTORIAL'
  | 'RESOURCE_COLLECTION'
  | 'TUTORIAL_COLLECTION'
  | 'TUTORIAL_BUNDLE'
  | 'TUTORIAL_BUNDLE_COLLECTION';

/** CQRS Command designed to enforce  process purchase. */
export class ProcessPurchaseCommand {
  constructor(
    public readonly buyerId: string,
    public readonly itemType: ProductType,
    public readonly itemId: string,
    public readonly correlationId: string,
    public readonly idempotencyKey?: string,
  ) {}
}
