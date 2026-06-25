import { CONTENT_VALIDATOR } from '../../domain/repositories/tokens';
import { SubscriptionPlanRpcController } from './consumers/subscription-plan.rpc';
import { UserRegisteredConsumer } from './consumers/user-registered.consumer';
import { OutboxRelayService } from './listeners/outbox-relay.listener';
import { ContentCatalogRpcPublisher } from './publishers/content-catalog.rpc';
import { ContentValidationRpcPublisher } from './publishers/content-validation.rpc';

export const MESSAGE_CONTROLLERS = [];

export const MESSAGE_COMPONENTS = [
  SubscriptionPlanRpcController,
  UserRegisteredConsumer,
  OutboxRelayService,
  ContentValidationRpcPublisher,
  ContentCatalogRpcPublisher,
  { provide: CONTENT_VALIDATOR, useExisting: ContentValidationRpcPublisher },
];
