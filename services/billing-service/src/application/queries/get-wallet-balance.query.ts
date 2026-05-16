/** CQRS Query for retrieving the wallet balance of a user. */
export class GetWalletBalanceQuery {
  constructor(public readonly userId: string) {}
}
