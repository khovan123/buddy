/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="jest" />

import { PurchaseConsumer } from '../../src/infrastructure/messaging/consumers/purchase.consumer';

describe('PurchaseConsumer saved content projection', () => {
  it('projects bundle collections into top-level and child owned content', async () => {
    const savedContentModel = {
      insertMany: jest.fn().mockResolvedValue([]),
    };
    const idempotentConsumer = {
      resolveCorrelationId: jest.fn().mockReturnValue('correlation-1'),
      runWithIdempotency: jest.fn(
        async (_correlationId: string, _routingKey: string, callback: (session: null) => unknown) =>
          callback(null),
      ),
    };
    const consumer = new PurchaseConsumer(savedContentModel as any, idempotentConsumer as any);

    await consumer.handlePurchaseCompleted(
      {
        payload: {
          purchaseId: 'purchase-1',
          buyerId: 'buyer-1',
          sellerId: 'seller-1',
          amount: '2500',
          purchasedAt: new Date().toISOString(),
          items: [
            {
              itemId: 'collection-1',
              itemType: 'TUTORIAL_BUNDLE_COLLECTION',
              tutorialIds: ['tutorial-1', 'tutorial-2'],
              resourceIds: ['resource-1', 'resource-2'],
            },
          ],
        },
      },
      {} as any,
    );

    expect(savedContentModel.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: 'collection-1',
          itemType: 'TUTORIAL_BUNDLE_COLLECTION',
        }),
        expect.objectContaining({ itemId: 'tutorial-1', itemType: 'TUTORIAL' }),
        expect.objectContaining({ itemId: 'tutorial-2', itemType: 'TUTORIAL' }),
        expect.objectContaining({ itemId: 'resource-1', itemType: 'RESOURCE' }),
        expect.objectContaining({ itemId: 'resource-2', itemType: 'RESOURCE' }),
      ]),
      { ordered: false, session: null },
    );
  });
});
