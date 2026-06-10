import { BillingPurchaseConsumer } from './consumers/billing-purchase.consumer';
import { ForumNotificationPublisher } from './publishers/forum-notification.publisher';
import { InteractionPublisher } from './publishers/interaction.publisher';

export const MESSAGE_COMPONENTS = [
  InteractionPublisher,
  ForumNotificationPublisher,
  BillingPurchaseConsumer,
];
