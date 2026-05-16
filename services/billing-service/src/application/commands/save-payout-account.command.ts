export class SavePayoutAccountCommand {
  constructor(
    public readonly userId: string,
    public readonly bankBin: string,
    public readonly bankAccountNumber: string,
    public readonly bankAccountName: string,
    public readonly bankName: string,
  ) {}
}
