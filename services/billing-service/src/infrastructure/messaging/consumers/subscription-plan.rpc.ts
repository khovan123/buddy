import { Nack, RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { AppLogger, EXCHANGES, QUEUES } from '@libs/common';
import {
  BILLING_ROUTINGKEYS,
  type BillingSubscriptionPlanRpcResponse,
  type SubscriptionPlanDetails,
} from '@libs/contracts';
import { Controller } from '@nestjs/common';
import type { Prisma } from '../../persistence/prisma/generated/client';
import { PrismaService } from '../../persistence/prisma/prisma.service';

type GetBillingSubscriptionPlanRpcMessage = {
  payload?: {
    userId?: string;
  };
};

type CatalogRow = {
  code: string;
  storageBytes: bigint;
  maxResources: number;
  maxTutorials: number;
  maxCollections: number;
  canCreateContent: boolean;
  maxSearchResults: number;
  pbac: Prisma.JsonValue | null;
};

@Controller()
export class SubscriptionPlanRpcController {
  private readonly logger = new AppLogger(SubscriptionPlanRpcController.name);

  constructor(private readonly prisma: PrismaService) {}

  @RabbitRPC({
    exchange: EXCHANGES.BILLING,
    routingKey: BILLING_ROUTINGKEYS.GET_SUBSCRIPTION_PLAN,
    queue: QUEUES.BILLING_RPC_GET_SUBSCRIPTION_PLAN,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async getSubscriptionPlan(
    message: GetBillingSubscriptionPlanRpcMessage,
  ): Promise<BillingSubscriptionPlanRpcResponse | Nack> {
    const userId = message.payload?.userId;
    if (!userId) {
      this.logger.warn(`Dropping malformed ${BILLING_ROUTINGKEYS.GET_SUBSCRIPTION_PLAN} RPC`);
      return new Nack(false);
    }

    try {
      const subscription = await this.prisma.client.subscription.findFirst({
        where: { userId, status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
        select: { plan: true },
      });

      if (!subscription) {
        return { subscription: null, planDetails: null };
      }

      const plan = await this.prisma.client.subscriptionPlanCatalog.findUnique({
        where: { code: subscription.plan },
        select: {
          code: true,
          storageBytes: true,
          maxResources: true,
          maxTutorials: true,
          maxCollections: true,
          canCreateContent: true,
          maxSearchResults: true,
          pbac: true,
        },
      });

      return {
        subscription: { plan: subscription.plan },
        planDetails: plan ? this.toPlanDetails(plan) : null,
      };
    } catch (error) {
      this.logger.error(
        `Failed ${BILLING_ROUTINGKEYS.GET_SUBSCRIPTION_PLAN} RPC for user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      return new Nack(false);
    }
  }

  private toPlanDetails(row: CatalogRow): SubscriptionPlanDetails {
    return {
      code: row.code as SubscriptionPlanDetails['code'],
      limits: {
        storageBytes: Number(row.storageBytes),
        maxResources: row.maxResources,
        maxTutorials: row.maxTutorials,
        maxCollections: row.maxCollections,
        canCreateContent: row.canCreateContent,
        maxSearchResults: row.maxSearchResults,
      },
      pbac: this.toRecord(row.pbac),
    };
  }

  private toRecord(value: Prisma.JsonValue | null): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }
}
