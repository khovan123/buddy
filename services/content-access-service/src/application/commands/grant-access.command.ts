import { PurchasedItemPayload } from '@libs/contracts';

/** CQRS Command designed to enforce  grant access. */
export class GrantAccessCommand {
  constructor(
    public readonly purchaseId: string,
    public readonly userId: string,
    public readonly purchasedItems: PurchasedItemPayload[],
    public readonly correlationId?: string,
  ) {}
}
