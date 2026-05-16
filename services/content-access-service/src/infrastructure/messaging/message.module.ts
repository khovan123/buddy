import { COMPENSATION_PUBLISHER } from '../../domain/repositories/tokens';
import { AccessConsumer } from './consumers/access.consumer';
import { CompensationPublisher } from './publishers/compensation.publisher';

export const MESSAGE_COMPONENTS = [
  {
    provide: COMPENSATION_PUBLISHER,
    useClass: CompensationPublisher,
  },
];

export const MESSAGE_CONTROLLERS = [AccessConsumer];
