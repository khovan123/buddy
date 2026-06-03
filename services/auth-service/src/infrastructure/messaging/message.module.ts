import { SubscriptionChangedConsumer } from './consumers/subscription-changed.consumer';
import { AuthEventPublisher } from './publishers/auth-event.publisher';

export const MESSAGE_COMPONENTS = [AuthEventPublisher, SubscriptionChangedConsumer];
