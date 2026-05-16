export class UpdateSubscriptionPlanCommand {
  constructor(
    public readonly userId: string,
    public readonly plan: string,
    public readonly correlationId: string,
  ) {}
}
