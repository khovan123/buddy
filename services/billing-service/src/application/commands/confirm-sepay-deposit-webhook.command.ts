export class ConfirmSePayDepositWebhookCommand {
  constructor(
    public readonly rawBody: string,
    public readonly signature: string | undefined,
    public readonly headers: Record<string, string | string[] | undefined>,
    public readonly correlationId: string,
  ) {}
}
