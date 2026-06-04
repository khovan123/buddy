import { SubscriptionChangedConsumer } from './consumers/subscription-changed.consumer';
import { AuthEventPublisher } from './publishers/auth-event.publisher';
import { BillingSubscriptionPlanPublisher } from './publishers/billing-subscription-plan.rpc';

export const MESSAGE_COMPONENTS = [
  AuthEventPublisher,
  BillingSubscriptionPlanPublisher,
  SubscriptionChangedConsumer,
];
