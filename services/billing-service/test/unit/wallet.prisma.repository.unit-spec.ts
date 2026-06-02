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
        take: 2,
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
