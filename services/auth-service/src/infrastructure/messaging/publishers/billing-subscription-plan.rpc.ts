import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  AppLogger,
  EXCHANGES,
  RABBITMQ_CONNECTION,
  attachTraceContextToMessage,
  ensureCorrelationId,
  getCorrelationId,
} from '@libs/common';
import {
  GetBillingSubscriptionPlanEvent,
  getFallbackPlanLimits,
  isSubscriptionPlan,
  type BillingSubscriptionPlanRpcResponse,
  type SubscriptionPlanDetails,
} from '@libs/contracts';
import { Inject, Injectable } from '@nestjs/common';

/** RabbitMQ RPC publisher for billing subscription-plan lookups. */
@Injectable()
export class BillingSubscriptionPlanPublisher {
  private readonly logger = new AppLogger(BillingSubscriptionPlanPublisher.name);

  constructor(
    @Inject(RABBITMQ_CONNECTION)
    private readonly amqpConnection: AmqpConnection,
  ) {}

  async resolveUserPlanDetails(
    userId: string,
    fallbackPlan?: string | null,
  ): Promise<SubscriptionPlanDetails | null> {
    const event = new GetBillingSubscriptionPlanEvent({ userId });
    const correlationId = ensureCorrelationId(
      event.correlationId,
      getCorrelationId(),
      event.eventId,
    );

    this.logger.log('Resolving billing subscription plan via RPC', {
      userId,
      fallbackPlan,
      routingKey: event.routingKey,
      correlationId,
      eventId: event.eventId,
    });

    try {
      const response = await this.fetchViaRpc(event);
      const fallbackDetails = response.planDetails ? null : this.fallbackDetails(fallbackPlan);
      const planDetails = response.planDetails ?? fallbackDetails;

      this.logger.log('Resolved billing subscription plan via RPC', {
        userId,
        routingKey: event.routingKey,
        correlationId,
        eventId: event.eventId,
        hasPlanDetails: Boolean(response.planDetails),
        usedFallback: Boolean(fallbackDetails),
        planCode: planDetails?.code ?? null,
      });

      return planDetails;
    } catch (error) {
      const fallbackDetails = this.fallbackDetails(fallbackPlan);

      this.logger.warn(
        `Failed to resolve billing subscription plan via RPC: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          userId,
          fallbackPlan,
          routingKey: event.routingKey,
          correlationId,
          eventId: event.eventId,
          usedFallback: Boolean(fallbackDetails),
          fallbackCode: fallbackDetails?.code ?? null,
        },
      );

      return fallbackDetails;
    }
  }

  private async fetchViaRpc(
    event: GetBillingSubscriptionPlanEvent,
  ): Promise<BillingSubscriptionPlanRpcResponse> {
    const routingKey = event.routingKey;
    const messageData = this.toMessageData(event);
    const correlationId =
      typeof messageData.correlationId === 'string' ? messageData.correlationId : event.eventId;
    if (!this.amqpConnection) {
      throw new Error('RabbitMQ default connection is not available');
    }
    this.logger.log('Publishing billing subscription plan RPC request', {
      userId: event.payload.userId,
      routingKey,
      exchange: EXCHANGES.BILLING,
      correlationId,
      eventId: event.eventId,
      timeoutMs: 10_000,
    });

    const response = await this.amqpConnection.request<BillingSubscriptionPlanRpcResponse>({
      exchange: EXCHANGES.BILLING,
      routingKey,
      payload: messageData,
      timeout: 10_000,
    });

    this.logger.log('Received billing subscription plan RPC response', {
      userId: event.payload.userId,
      routingKey,
      exchange: EXCHANGES.BILLING,
      correlationId,
      eventId: event.eventId,
      hasPlanDetails: Boolean(response.planDetails),
      planCode: response.planDetails?.code ?? null,
    });

    return response;
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
      limits: getFallbackPlanLimits(plan),
      pbac: {},
    };
  }
}
