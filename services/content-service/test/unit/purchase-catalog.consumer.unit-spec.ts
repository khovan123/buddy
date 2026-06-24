/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="jest" />

import { PurchaseCatalogConsumer } from '../../src/infrastructure/messaging/consumers/purchase-catalog.consumer';
import { CollectionType } from '../../src/infrastructure/persistence/mongo/schemas/collection.schema';

function id(value: string) {
  return { toString: () => value };
}

function queryResult<T>(value: T) {
  return {
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

function resource(value: string, price: number) {
  return { _id: id(value), price };
}

describe('PurchaseCatalogConsumer', () => {
  let resourceModel: { findById: jest.Mock; find: jest.Mock };
  let tutorialModel: { findById: jest.Mock; find: jest.Mock };
  let collectionModel: { findById: jest.Mock; find: jest.Mock };
  let consumer: PurchaseCatalogConsumer;

  beforeEach(() => {
    resourceModel = { findById: jest.fn(), find: jest.fn() };
    tutorialModel = { findById: jest.fn(), find: jest.fn() };
    collectionModel = { findById: jest.fn(), find: jest.fn() };
    consumer = new PurchaseCatalogConsumer(
      resourceModel as any,
      tutorialModel as any,
      collectionModel as any,
    );
  });

  it('quotes a standalone resource', async () => {
    resourceModel.findById.mockReturnValue(
      queryResult({ _id: id('resource-1'), userId: 'seller-1', price: 100 }),
    );

    await expect(
      consumer.handleGetPurchaseCatalog({
        itemId: 'resource-1',
        itemType: 'RESOURCE',
        userId: 'buyer-1',
      }),
    ).resolves.toEqual({
      sellerId: 'seller-1',
      priceInCents: '100',
      items: [{ itemId: 'resource-1', itemType: 'RESOURCE', resourceIds: ['resource-1'] }],
    });
  });

  it('returns an empty quote when a requested resource no longer exists', async () => {
    resourceModel.findById.mockReturnValue(queryResult(null));

    await expect(
      consumer.handleGetPurchaseCatalog({
        itemId: 'missing-resource',
        itemType: 'RESOURCE',
        userId: 'buyer-1',
      }),
    ).resolves.toEqual({
      sellerId: '',
      priceInCents: '0',
      items: [],
    });
  });

  it('quotes a resource collection from its canonical resourceIds', async () => {
    collectionModel.findById.mockReturnValue(
      queryResult({
        _id: id('collection-1'),
        userId: 'seller-1',
        type: CollectionType.RESOURCE,
        discount: 10,
        resourceIds: ['resource-1', 'resource-2'],
      }),
    );
    resourceModel.find.mockReturnValue(
      queryResult([resource('resource-1', 100), resource('resource-2', 200)]),
    );

    const quote = await consumer.handleGetPurchaseCatalog({
      itemId: 'collection-1',
      itemType: 'RESOURCE_COLLECTION',
      userId: 'buyer-1',
    });

    expect(quote.priceInCents).toBe('270');
    expect(quote.items[0]?.resourceIds).toEqual(['resource-1', 'resource-2']);
  });

  it('does not charge an owned resource again when quoting a resource collection', async () => {
    collectionModel.findById.mockReturnValue(
      queryResult({
        _id: id('collection-1'),
        userId: 'seller-1',
        type: CollectionType.RESOURCE,
        discount: 10,
        resourceIds: ['resource-1', 'resource-2'],
      }),
    );
    resourceModel.find.mockReturnValue(
      queryResult([resource('resource-1', 100), resource('resource-2', 200)]),
    );

    const quote = await consumer.handleGetPurchaseCatalog({
      itemId: 'collection-1',
      itemType: 'RESOURCE_COLLECTION',
      userId: 'buyer-1',
      ownedResourceIds: ['resource-1'],
    });

    expect(quote.priceInCents).toBe('200');
  });

  it('quotes a standalone tutorial without attached resources', async () => {
    tutorialModel.findById.mockReturnValue(
      queryResult({ _id: id('tutorial-1'), userId: 'seller-1', price: 1000 }),
    );

    const quote = await consumer.handleGetPurchaseCatalog({
      itemId: 'tutorial-1',
      itemType: 'TUTORIAL',
      userId: 'buyer-1',
    });

    expect(quote.priceInCents).toBe('1000');
    expect(quote.items[0]).toEqual({
      itemId: 'tutorial-1',
      itemType: 'TUTORIAL',
      resourceIds: [],
      tutorialId: 'tutorial-1',
    });
  });

  it('does not charge an owned tutorial again when quoting a tutorial collection', async () => {
    collectionModel.findById.mockReturnValue(
      queryResult({
        _id: id('tutorial-collection-1'),
        userId: 'seller-1',
        type: CollectionType.TUTORIAL,
        discount: 20,
      }),
    );
    tutorialModel.find.mockReturnValue(
      queryResult([
        { _id: id('tutorial-1'), price: 1000 },
        { _id: id('tutorial-2'), price: 2000 },
      ]),
    );

    const quote = await consumer.handleGetPurchaseCatalog({
      itemId: 'tutorial-collection-1',
      itemType: 'TUTORIAL_COLLECTION',
      userId: 'buyer-1',
      ownedTutorialIds: ['tutorial-1'],
    });

    expect(quote.priceInCents).toBe('2000');
  });

  it('includes direct resources and resource collections in a tutorial bundle', async () => {
    tutorialModel.findById.mockReturnValue(
      queryResult({
        _id: id('tutorial-1'),
        userId: 'seller-1',
        price: 1000,
        discountBundle: 15,
        resourceIds: ['resource-1'],
        collectionIds: ['collection-1'],
      }),
    );
    collectionModel.find.mockReturnValue(
      queryResult([{ _id: id('collection-1'), resourceIds: ['resource-2'] }]),
    );
    resourceModel.find.mockReturnValue(
      queryResult([resource('resource-1', 100), resource('resource-2', 200)]),
    );

    const quote = await consumer.handleGetPurchaseCatalog({
      itemId: 'tutorial-1',
      itemType: 'TUTORIAL_BUNDLE',
      userId: 'buyer-1',
    });

    expect(quote.priceInCents).toBe('1105');
    expect(quote.items[0]?.resourceIds).toEqual(['resource-1', 'resource-2']);
  });

  it('quotes a partially owned tutorial collection without charging duplicate resources', async () => {
    collectionModel.findById.mockReturnValue(
      queryResult({
        _id: id('tutorial-collection-1'),
        userId: 'seller-1',
        type: CollectionType.TUTORIAL,
        discount: 20,
      }),
    );
    tutorialModel.find.mockReturnValue(
      queryResult([
        {
          _id: id('tutorial-1'),
          userId: 'seller-1',
          price: 1000,
          discountBundle: 15,
          resourceIds: ['resource-1', 'resource-2'],
        },
        {
          _id: id('tutorial-2'),
          userId: 'seller-1',
          price: 2000,
          discountBundle: 15,
          collectionIds: ['collection-1'],
        },
      ]),
    );
    collectionModel.find.mockReturnValue(
      queryResult([{ _id: id('collection-1'), resourceIds: ['resource-2', 'resource-3'] }]),
    );
    resourceModel.find
      .mockReturnValueOnce(queryResult([resource('resource-1', 100), resource('resource-2', 200)]))
      .mockReturnValueOnce(queryResult([resource('resource-2', 200), resource('resource-3', 300)]));

    const quote = await consumer.handleGetPurchaseCatalog({
      itemId: 'tutorial-collection-1',
      itemType: 'TUTORIAL_BUNDLE_COLLECTION',
      userId: 'buyer-1',
      ownedTutorialIds: ['tutorial-1'],
      ownedResourceIds: ['resource-1'],
    });

    expect(quote.priceInCents).toBe('2500');
    expect(quote.items[0]?.tutorialIds).toEqual(['tutorial-1', 'tutorial-2']);
    expect(quote.items[0]?.resourceIds).toEqual(['resource-1', 'resource-2', 'resource-3']);
  });
});
