import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  AppLogger,
  EXCHANGES,
  attachTraceContextToMessage,
  ensureCorrelationId,
  getCorrelationId,
} from '@libs/common';
import {
  GetBillingSubscriptionPlanEvent,
  isSubscriptionPlan,
  type BillingSubscriptionPlanRpcResponse,
  type SubscriptionPlanDetails,
} from '@libs/contracts';
import { Injectable } from '@nestjs/common';

/** RabbitMQ RPC publisher for billing subscription-plan lookups. */
@Injectable()
export class BillingSubscriptionPlanPublisher {
  private readonly logger = new AppLogger(BillingSubscriptionPlanPublisher.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  async resolveUserPlanDetails(
    userId: string,
    fallbackPlan?: string | null,
  ): Promise<SubscriptionPlanDetails | null> {
    const event = new GetBillingSubscriptionPlanEvent({ userId });

    try {
      const response = await this.fetchViaRpc(event);
      return response.planDetails ?? this.fallbackDetails(fallbackPlan);
    } catch (error) {
      this.logger.warn(
        `Failed to resolve billing subscription plan via RPC: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.fallbackDetails(fallbackPlan);
    }
  }

  private async fetchViaRpc(
    event: GetBillingSubscriptionPlanEvent,
  ): Promise<BillingSubscriptionPlanRpcResponse> {
    const routingKey = event.routingKey;
    const messageData = this.toMessageData(event);

    return this.amqpConnection.request<BillingSubscriptionPlanRpcResponse>({
      exchange: EXCHANGES.BILLING,
      routingKey,
      payload: messageData,
      timeout: 10_000,
    });
  }

  private toMessageData(event: GetBillingSubscriptionPlanEvent) {
    const correlationId = ensureCorrelationId(
      event.correlationId,
      getCorrelationId(),
      event.eventId,
    );

    return attachTraceContextToMessage({
      eventId: event.eventId,
      routingKey: event.routingKey,
      version: event.version,
      occurredAt: event.occurredAt,
      correlationId,
      causationId: event.causationId,
      payload: event.payload,
    });
  }

  private fallbackDetails(plan?: string | null): SubscriptionPlanDetails | null {
    if (!plan || !isSubscriptionPlan(plan)) {
      return null;
    }

    return {
      code: plan,
      limits: {
        storageBytes: 0,
        maxResources: 0,
        maxTutorials: 0,
        maxCollections: 0,
        canCreateContent: false,
        maxSearchResults: 0,
      },
      pbac: {},
    };
  }
}
