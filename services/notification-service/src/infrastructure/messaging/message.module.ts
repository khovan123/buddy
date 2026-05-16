import { NotificationConsumer } from './consumers/notification.consumer';
import { NotificationEventPublisher } from './publishers/notification-event.publisher';

export const MESSAGE_CONTROLLERS = [NotificationConsumer];

export const MESSAGE_COMPONENTS = [NotificationEventPublisher];
