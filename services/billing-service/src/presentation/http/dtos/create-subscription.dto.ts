import { IsEnum, IsNotEmpty } from 'class-validator';
import { SubscriptionPlan } from '@libs/contracts';

export class CreateSubscriptionDto {
  @IsEnum(SubscriptionPlan)
  @IsNotEmpty()
  plan!: SubscriptionPlan;
}
