import { CONTENT_VALIDATOR } from '../../domain/repositories/tokens';
import { SubscriptionPlanRpcController } from './consumers/subscription-plan.rpc';
import { OutboxRelayService } from './listeners/outbox-relay.listener';
import { ContentCatalogRpcPublisher } from './publishers/content-catalog.rpc';
import { ContentValidationRpcPublisher } from './publishers/content-validation.rpc';

export const MESSAGE_CONTROLLERS = [];

export const MESSAGE_COMPONENTS = [
  SubscriptionPlanRpcController,
  OutboxRelayService,
  ContentValidationRpcPublisher,
  ContentCatalogRpcPublisher,
  { provide: CONTENT_VALIDATOR, useExisting: ContentValidationRpcPublisher },
];
