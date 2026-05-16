export class RevokeAccessCommand {
  constructor(
    public readonly purchaseId: string,
    public readonly userId: string,
  ) {}
}
