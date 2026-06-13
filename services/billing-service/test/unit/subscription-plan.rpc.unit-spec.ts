/// <reference types="jest" />

jest.mock('../../src/infrastructure/persistence/prisma/prisma.service', () => ({
  PrismaService: class {},
}));

import { Nack } from '@golevelup/nestjs-rabbitmq';

import { SubscriptionPlanRpcController } from '../../src/infrastructure/messaging/consumers/subscription-plan.rpc';
import { MESSAGE_COMPONENTS } from '../../src/infrastructure/messaging/message.module';

describe('SubscriptionPlanRpcController', () => {
  beforeAll(() => {
    process.env.LOG_LEVEL ??= 'debug';
    process.env.SERVICE_NAME ??= 'billing-service';
    process.env.NODE_ENV ??= 'test';
  });

  const createController = (client: {
    subscription: {
      findFirst: jest.Mock;
    };
    subscriptionPlanCatalog: {
      findUnique: jest.Mock;
    };
  }) => new SubscriptionPlanRpcController({ client } as never);

  it('is registered for RabbitMQ provider discovery', () => {
    expect(MESSAGE_COMPONENTS).toContain(SubscriptionPlanRpcController);
  });

  it('returns active subscription plan details for auth login RPC', async () => {
    const client = {
      subscription: {
        findFirst: jest.fn().mockResolvedValue({ plan: 'CREATOR_PRO' }),
      },
      subscriptionPlanCatalog: {
        findUnique: jest.fn().mockResolvedValue({
          code: 'CREATOR_PRO',
          storageBytes: 1024n,
          maxResources: 10,
          maxTutorials: 5,
          maxCollections: 3,
          canCreateContent: true,
          maxSearchResults: 50,
          pbac: { canPublish: true },
        }),
      },
    };
    const controller = createController(client);

    await expect(
      controller.getSubscriptionPlan({ payload: { userId: 'user-1' } }),
    ).resolves.toEqual({
      subscription: { plan: 'CREATOR_PRO' },
      planDetails: {
        code: 'CREATOR_PRO',
        limits: {
          storageBytes: 1024,
          maxResources: 10,
          maxTutorials: 5,
          maxCollections: 3,
          canCreateContent: true,
          maxSearchResults: 50,
        },
        pbac: { canPublish: true },
      },
    });

    expect(client.subscription.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1', status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
      select: { plan: true },
    });
    expect(client.subscriptionPlanCatalog.findUnique).toHaveBeenCalledWith({
      where: { code: 'CREATOR_PRO' },
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
  });

  it('nacks malformed auth login RPC requests without requeueing', async () => {
    const client = {
      subscription: { findFirst: jest.fn() },
      subscriptionPlanCatalog: { findUnique: jest.fn() },
    };
    const controller = createController(client);

    await expect(controller.getSubscriptionPlan({ payload: {} })).resolves.toEqual(
      expect.any(Nack),
    );
    expect(client.subscription.findFirst).not.toHaveBeenCalled();
  });
});
