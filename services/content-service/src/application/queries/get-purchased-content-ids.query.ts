/** CQRS query to list content IDs already purchased by a user. */
export class GetPurchasedContentIdsQuery {
  constructor(public readonly userId: string) {}
}
