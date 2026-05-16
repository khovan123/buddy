export class WithdrawWalletCommand {
  constructor(
    public readonly userId: string,
    public readonly amountInCents: bigint,
    public readonly idempotencyKey?: string,
    public readonly correlationId?: string,
  ) {}
}
