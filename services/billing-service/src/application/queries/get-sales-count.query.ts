/** CQRS Query for retrieving the total successful sales count of a seller. */
export class GetSalesCountQuery {
  constructor(public readonly sellerId: string) {}
}
