import { SubscriptionPlan } from '@libs/contracts';

export class CreateSubscriptionCommand {
  constructor(
    public readonly userId: string,
    public readonly plan: SubscriptionPlan,
    public readonly correlationId: string,
  ) {}
}
