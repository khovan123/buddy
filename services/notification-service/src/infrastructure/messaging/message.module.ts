import { NotificationConsumer } from './consumers/notification.consumer';
import { NotificationEventPublisher } from './publishers/notification-event.publisher';

export const MESSAGE_CONTROLLERS = [];

export const MESSAGE_COMPONENTS = [NotificationConsumer, NotificationEventPublisher];
