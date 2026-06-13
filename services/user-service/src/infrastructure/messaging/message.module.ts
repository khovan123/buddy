import { UserEventConsumer } from './consumers/user-event.consumer';
import { UserRpcController } from './consumers/user.rpc';
import { UserEventPublisher } from './publishers/user-event.publisher';

export const MESSAGE_CONTROLLERS = [];

export const MESSAGE_COMPONENTS = [UserEventConsumer, UserRpcController, UserEventPublisher];
