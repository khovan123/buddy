/** CQRS Query for retrieving the transaction history of a user. */
export class GetTransactionHistoryQuery {
  constructor(
    public readonly userId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {}
}
