/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="jest" />

jest.mock('../../src/infrastructure/persistence/prisma/prisma.service', () => ({
  PrismaService: class {},
}));

import { WalletPrismaRepository } from '../../src/infrastructure/persistence/prisma/repositories/wallet.prisma.repository';

describe('WalletPrismaRepository purchase ownership', () => {
  it('extracts child resources and tutorials stored in purchase metadata', async () => {
    const prisma = {
      client: {
        walletTransaction: {
          findMany: jest.fn().mockResolvedValue([
            { metadata: { itemType: 'RESOURCE', itemId: 'resource-standalone' } },
            { metadata: { itemType: 'TUTORIAL', itemId: 'tutorial-standalone' } },
            {
              metadata: {
                itemType: 'TUTORIAL_BUNDLE_COLLECTION',
                itemId: 'collection-1',
                items: [
                  {
                    itemType: 'TUTORIAL_BUNDLE_COLLECTION',
                    resourceIds: ['resource-1', 'resource-2'],
                    tutorialIds: ['tutorial-1', 'tutorial-2'],
                  },
                ],
              },
            },
          ]),
        },
      },
    };
    const repository = new WalletPrismaRepository(prisma as any, { emit: jest.fn() } as any);

    await expect(repository.findSuccessfulPurchasedItemIds('buyer-1', 'RESOURCE')).resolves.toEqual(
      new Set(['resource-standalone', 'resource-1', 'resource-2']),
    );
    await expect(repository.findSuccessfulPurchasedItemIds('buyer-1', 'TUTORIAL')).resolves.toEqual(
      new Set(['tutorial-standalone', 'tutorial-1', 'tutorial-2']),
    );
  });

  it('records zero-priced purchases so ownership and idempotency remain durable', async () => {
    const tx = {
      wallet: {
        upsert: jest
          .fn()
          .mockResolvedValueOnce({ id: 'buyer-wallet', balanceInCents: 0n })
          .mockResolvedValueOnce({ id: 'seller-wallet', balanceInCents: 0n }),
        update: jest.fn(),
      },
      walletTransaction: {
        createMany: jest.fn(),
      },
      outbox: {
        create: jest.fn(),
      },
    };
    const prisma = {
      client: {
        $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
        ),
      },
    };
    const eventEmitter = { emit: jest.fn() };
    const repository = new WalletPrismaRepository(prisma as any, eventEmitter as any);

    await repository.transferForPurchaseAndInsertOutbox({
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      amountInCents: 0n,
      itemType: 'RESOURCE_COLLECTION',
      itemId: 'collection-1',
      purchasedItems: [
        {
          itemId: 'collection-1',
          itemType: 'RESOURCE_COLLECTION',
          resourceIds: ['resource-1'],
        },
      ],
      correlationId: 'correlation-1',
      eventType: 'BILLING_PURCHASE_COMPLETED',
      eventPayload: { payload: {} },
      idempotencyKey: 'idempotency-1',
    });

    expect(tx.wallet.update).not.toHaveBeenCalled();
    expect(tx.walletTransaction.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: 'buyer-1',
          amountInCents: 0n,
          idempotencyKey: 'idempotency-1-debit',
          metadata: expect.objectContaining({
            items: [
              {
                itemId: 'collection-1',
                itemType: 'RESOURCE_COLLECTION',
                resourceIds: ['resource-1'],
              },
            ],
          }),
        }),
      ]),
    });
    expect(tx.outbox.create).toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalled();
  });

  it('debits wallet and writes subscription outbox when activating a paid subscription', async () => {
    const startsAt = new Date('2026-07-10T00:00:00.000Z');
    const tx = {
      subscription: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'subscription-1',
          userId: 'user-1',
          plan: 'STUDENT_FREE',
          status: 'ACTIVE',
          startsAt: new Date('2026-07-09T00:00:00.000Z'),
          expiresAt: null,
        }),
        upsert: jest.fn().mockResolvedValue({
          id: 'subscription-1',
          userId: 'user-1',
          plan: 'STUDENT_PRO',
          status: 'ACTIVE',
          startsAt,
          expiresAt: null,
        }),
      },
      subscriptionPlanCatalog: {
        findUnique: jest.fn().mockResolvedValue({
          code: 'STUDENT_PRO',
          active: true,
          monthlyPriceCents: 49000,
          currency: 'VND',
        }),
      },
      wallet: {
        upsert: jest.fn().mockResolvedValue({
          id: 'wallet-1',
          balanceInCents: 100000n,
        }),
        update: jest.fn(),
      },
      walletTransaction: {
        create: jest.fn(),
      },
      outbox: {
        create: jest.fn(),
      },
    };
    const prisma = {
      client: {
        $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
        ),
      },
    };
    const eventEmitter = { emit: jest.fn() };
    const repository = new WalletPrismaRepository(prisma as any, eventEmitter as any);

    await expect(
      repository.activateSubscriptionWithWalletDebitAndInsertOutbox({
        userId: 'user-1',
        plan: 'STUDENT_PRO',
        correlationId: 'correlation-1',
        eventType: 'BILLING_SUBSCRIPTION_CHANGED',
      }),
    ).resolves.toEqual({
      subscription: {
        id: 'subscription-1',
        userId: 'user-1',
        plan: 'STUDENT_PRO',
        status: 'ACTIVE',
        startsAt,
        expiresAt: null,
      },
      previousPlan: 'STUDENT_FREE',
      amountInCents: '49000',
    });

    expect(tx.wallet.update).toHaveBeenCalledWith({
      where: { id: 'wallet-1' },
      data: { balanceInCents: { decrement: 49000n } },
    });
    expect(tx.walletTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        walletId: 'wallet-1',
        userId: 'user-1',
        type: 'PURCHASE_DEBIT',
        status: 'SUCCESS',
        amountInCents: 49000n,
        metadata: expect.objectContaining({
          itemType: 'SUBSCRIPTION',
          itemId: 'STUDENT_PRO',
          previousPlan: 'STUDENT_FREE',
        }),
      }),
    });
    expect(tx.subscription.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      update: expect.objectContaining({
        plan: 'STUDENT_PRO',
        status: 'ACTIVE',
        expiresAt: null,
      }),
      create: expect.objectContaining({
        userId: 'user-1',
        plan: 'STUDENT_PRO',
        status: 'ACTIVE',
      }),
    });
    expect(tx.outbox.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        correlationId: 'correlation-1',
        type: 'BILLING_SUBSCRIPTION_CHANGED',
        payload: expect.objectContaining({
          userId: 'user-1',
          plan: 'STUDENT_PRO',
          previousPlan: 'STUDENT_FREE',
        }),
      }),
    });
    expect(eventEmitter.emit).toHaveBeenCalled();
  });

  it('blocks paid subscription activation when wallet balance is insufficient', async () => {
    const tx = {
      subscription: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
      },
      subscriptionPlanCatalog: {
        findUnique: jest.fn().mockResolvedValue({
          code: 'CREATOR_PRO',
          active: true,
          monthlyPriceCents: 99000,
          currency: 'VND',
        }),
      },
      wallet: {
        upsert: jest.fn().mockResolvedValue({
          id: 'wallet-1',
          balanceInCents: 1000n,
        }),
        update: jest.fn(),
      },
      walletTransaction: {
        create: jest.fn(),
      },
      outbox: {
        create: jest.fn(),
      },
    };
    const prisma = {
      client: {
        $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
        ),
      },
    };
    const eventEmitter = { emit: jest.fn() };
    const repository = new WalletPrismaRepository(prisma as any, eventEmitter as any);

    await expect(
      repository.activateSubscriptionWithWalletDebitAndInsertOutbox({
        userId: 'user-1',
        plan: 'CREATOR_PRO',
        correlationId: 'correlation-1',
        eventType: 'BILLING_SUBSCRIPTION_CHANGED',
      }),
    ).rejects.toThrow('Insufficient wallet balance for this subscription');

    expect(tx.wallet.update).not.toHaveBeenCalled();
    expect(tx.walletTransaction.create).not.toHaveBeenCalled();
    expect(tx.subscription.upsert).not.toHaveBeenCalled();
    expect(tx.outbox.create).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('confirms a top-up by unique recent pending amount when webhook reference is not usable', async () => {
    const transaction = {
      id: 'transaction-1',
      walletId: 'wallet-1',
      userId: 'user-1',
      status: 'PENDING',
      amountInCents: 50000n,
    };
    const tx = {
      wallet: {
        update: jest.fn(),
      },
      walletTransaction: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([transaction]),
        update: jest.fn(),
      },
      outbox: {
        create: jest.fn(),
      },
    };
    const prisma = {
      client: {
        $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
        ),
      },
    };
    const eventEmitter = { emit: jest.fn() };
    const repository = new WalletPrismaRepository(prisma as any, eventEmitter as any);

    await expect(
      repository.confirmTopUpAndInsertOutbox({
        externalReference: 'unmatched-sepay-code',
        provider: 'SEPAY',
        amountInCents: 50000n,
        eventType: 'BILLING_WALLET_TOPPED_UP',
        eventPayload: { payload: {} },
        correlationId: 'correlation-1',
      }),
    ).resolves.toEqual({
      transactionId: 'transaction-1',
      userId: 'user-1',
      walletId: 'wallet-1',
    });

    expect(tx.walletTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'TOP_UP',
          status: 'PENDING',
          provider: 'SEPAY',
          amountInCents: 50000n,
        }),
        take: 10,
      }),
    );
    expect(tx.wallet.update).toHaveBeenCalledWith({
      where: { id: 'wallet-1' },
      data: { balanceInCents: { increment: 50000n } },
    });
    expect(tx.walletTransaction.update).toHaveBeenCalledWith({
      where: { id: 'transaction-1' },
      data: { status: 'SUCCESS', confirmedAt: expect.any(Date) },
    });
    expect(tx.outbox.create).toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalled();
  });
});
