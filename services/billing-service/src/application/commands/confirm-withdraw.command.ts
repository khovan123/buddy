export class ConfirmWithdrawCommand {
  constructor(
    public readonly transactionId: string,
    public readonly correlationId: string,
  ) {}
}
