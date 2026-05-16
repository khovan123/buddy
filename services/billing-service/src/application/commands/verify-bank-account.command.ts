export class VerifyBankAccountCommand {
  constructor(
    public readonly userId: string,
    public readonly bankBin: string,
    public readonly bankAccountNumber: string,
  ) {}
}
