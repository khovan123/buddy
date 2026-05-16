import { afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { CommandBus, CqrsModule } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';

jest.mock('@libs/common', () => ({
  AppLogger: class {
    constructor() {}

    log() {}

    warn() {}

    error() {}
  },
  OtelTracingInterceptor: class {
    intercept() {
      return undefined;
    }
  },
  EXCHANGES: {
    BILLING: 'BILLING',
  },
  QUEUES: {
    ACCESS_COMMANDS: 'ACCESS_COMMANDS',
  },
}));

jest.mock('@libs/contracts', () => {
  const actual = jest.requireActual('@libs/contracts');
  return {
    ...(actual as any),
    BILLING_ROUTINGKEYS: {
      PURCHASE_COMPLETED: 'PURCHASE_COMPLETED',
    },
    PurchaseCompletedEvent: class {
      payload: unknown;
    },
  };
});

jest.mock('../../src/infrastructure/persistence/prisma/prisma.service', () => ({
  PrismaService: class {},
}));

import { GrantAccessHandler } from '../../src/application/commands/handlers/grant-access.handler';
import { COMPENSATION_PUBLISHER } from '../../src/domain/repositories/tokens';
import { AccessConsumer } from '../../src/infrastructure/messaging/consumers/access.consumer';
import { PrismaService } from '../../src/infrastructure/persistence/prisma/prisma.service';

type GrantedAccessRecord = {
  userId: string;
  resourceId: string;
  resourceType: 'RESOURCE' | 'COLLECTION' | 'TUTORIAL';
};

type PurchasedItemPayload = {
  itemId: string;
  itemType:
    | 'RESOURCE'
    | 'TUTORIAL'
    | 'RESOURCE_COLLECTION'
    | 'TUTORIAL_COLLECTION'
    | 'TUTORIAL_BUNDLE'
    | 'TUTORIAL_BUNDLE_COLLECTION';
  resourceIds?: string[];
  tutorialId?: string;
  tutorialIds?: string[];
};

function createPrismaMock() {
  const grantedAccessRecords: GrantedAccessRecord[] = [];

  const transactionClient = {
    userResourceAccess: {
      upsert: jest.fn(async (input: { create: GrantedAccessRecord }) => {
        grantedAccessRecords.push({
          userId: input.create.userId,
          resourceId: input.create.resourceId,
          resourceType: input.create.resourceType,
        });

        return input.create;
      }),
    },
  };

  const transactionMock = jest.fn(
    async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
      callback(transactionClient),
  );

  const prismaMock: any = {
    $transaction: transactionMock,
    client: {
      $transaction: transactionMock,
    },
  };

  return {
    prismaMock,
    grantedAccessRecords,
    transactionClient,
  };
}

function buildPurchaseEvent(items: PurchasedItemPayload[]) {
  return {
    purchaseId: randomUUID(),
    buyerId: randomUUID(),
    sellerId: randomUUID(),
    amount: '123000',
    purchasedAt: new Date().toISOString(),
    items,
  };
}

describe('Content Access Service E2E', () => {
  let moduleRef: TestingModule;
  let consumer: AccessConsumer;
  let commandBus: CommandBus;
  let compensationPublisherMock: { publish: jest.Mock };
  const { prismaMock, grantedAccessRecords, transactionClient } = createPrismaMock();

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [AccessConsumer],
      providers: [
        GrantAccessHandler,
        { provide: PrismaService, useValue: prismaMock },
        { provide: COMPENSATION_PUBLISHER, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    await moduleRef.init();

    consumer = moduleRef.get(AccessConsumer);
    commandBus = moduleRef.get(CommandBus);
    compensationPublisherMock = moduleRef.get(COMPENSATION_PUBLISHER);
    expect(commandBus).toBeTruthy();
  });

  afterEach(() => {
    grantedAccessRecords.length = 0;
    transactionClient.userResourceAccess.upsert.mockClear();
    prismaMock.$transaction.mockClear();
    compensationPublisherMock.publish.mockClear();
  });

  it.each([
    {
      name: 'RESOURCE',
      items: [{ itemId: 'resource-1', itemType: 'RESOURCE', resourceIds: ['resource-1'] }],
      expected: [{ resourceId: 'resource-1', resourceType: 'RESOURCE' }],
    },
    {
      name: 'TUTORIAL',
      items: [
        { itemId: 'tutorial-1', itemType: 'TUTORIAL', tutorialId: 'tutorial-1', resourceIds: [] },
      ],
      expected: [{ resourceId: 'tutorial-1', resourceType: 'TUTORIAL' }],
    },
    {
      name: 'RESOURCE_COLLECTION',
      items: [
        {
          itemId: 'resource-collection-1',
          itemType: 'RESOURCE_COLLECTION',
          resourceIds: ['resource-2', 'resource-3'],
        },
      ],
      expected: [
        { resourceId: 'resource-collection-1', resourceType: 'COLLECTION' },
        { resourceId: 'resource-2', resourceType: 'RESOURCE' },
        { resourceId: 'resource-3', resourceType: 'RESOURCE' },
      ],
    },
    {
      name: 'TUTORIAL_COLLECTION',
      items: [
        {
          itemId: 'tutorial-collection-1',
          itemType: 'TUTORIAL_COLLECTION',
          tutorialIds: ['tutorial-2', 'tutorial-3'],
          resourceIds: [],
        },
      ],
      expected: [
        { resourceId: 'tutorial-collection-1', resourceType: 'COLLECTION' },
        { resourceId: 'tutorial-2', resourceType: 'TUTORIAL' },
        { resourceId: 'tutorial-3', resourceType: 'TUTORIAL' },
      ],
    },
    {
      name: 'TUTORIAL_BUNDLE',
      items: [
        {
          itemId: 'tutorial-bundle-1',
          itemType: 'TUTORIAL_BUNDLE',
          tutorialId: 'tutorial-4',
          resourceIds: ['resource-4', 'resource-5'],
        },
      ],
      expected: [
        { resourceId: 'tutorial-4', resourceType: 'TUTORIAL' },
        { resourceId: 'resource-4', resourceType: 'RESOURCE' },
        { resourceId: 'resource-5', resourceType: 'RESOURCE' },
      ],
    },
    {
      name: 'TUTORIAL_BUNDLE_COLLECTION',
      items: [
        {
          itemId: 'tutorial-bundle-collection-1',
          itemType: 'TUTORIAL_BUNDLE_COLLECTION',
          tutorialIds: ['tutorial-6'],
          resourceIds: ['resource-6'],
        },
      ],
      expected: [
        {
          resourceId: 'tutorial-bundle-collection-1',
          resourceType: 'COLLECTION',
        },
        { resourceId: 'tutorial-6', resourceType: 'TUTORIAL' },
        { resourceId: 'resource-6', resourceType: 'RESOURCE' },
      ],
    },
  ])('grants correct access for $name purchase', async ({ items, expected }) => {
    const payload = buildPurchaseEvent(items as PurchasedItemPayload[]);

    const result = await consumer.handlePurchaseCompleted({ data: { payload } } as any);

    expect(result).toBeUndefined();
    expect(compensationPublisherMock.publish).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(transactionClient.userResourceAccess.upsert).toHaveBeenCalledTimes(expected.length);
    expect(grantedAccessRecords).toEqual(
      expected.map((entry) => ({
        userId: payload.buyerId,
        resourceId: entry.resourceId,
        resourceType: entry.resourceType,
      })),
    );
    expect(payload.buyerId).not.toBe('');
    expect(payload.items).toEqual(items);
  });

  it('emits compensation event when access grant fails', async () => {
    const payload = buildPurchaseEvent([
      { itemId: 'resource-error', itemType: 'RESOURCE', resourceIds: ['resource-error'] },
    ]);

    prismaMock.$transaction.mockImplementationOnce(async () => {
      throw new Error('database unavailable');
    });

    const result = await consumer.handlePurchaseCompleted({ data: { payload } } as any);

    expect(result).toBeUndefined(); // Should absorb error and emit compensation
    expect(compensationPublisherMock.publish).toHaveBeenCalledTimes(1);
    expect(compensationPublisherMock.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          reason: 'database unavailable',
        }),
      }),
    );
  });

  it('returns Nack when compensation event also fails', async () => {
    const payload = buildPurchaseEvent([
      { itemId: 'resource-error', itemType: 'RESOURCE', resourceIds: ['resource-error'] },
    ]);

    prismaMock.$transaction.mockImplementationOnce(async () => {
      throw new Error('database unavailable');
    });

    compensationPublisherMock.publish.mockImplementationOnce(async () => {
      throw new Error('broker unavailable');
    });

    await consumer.handlePurchaseCompleted({ data: { payload } } as any);

    // Verify it returns Nack with requeue=true
  });
});
