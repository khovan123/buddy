import { BillingPurchaseConsumer } from './billing-purchase.consumer';
import { ForumNotificationPublisher } from './forum-notification.publisher';
import { InteractionPublisher } from './interaction.publisher';

export const MESSAGE_COMPONENTS = [
  InteractionPublisher,
  ForumNotificationPublisher,
  BillingPurchaseConsumer,
];
