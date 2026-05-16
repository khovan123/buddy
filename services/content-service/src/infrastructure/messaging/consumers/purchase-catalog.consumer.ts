import { AppLogger, EXCHANGES, QUEUES } from '@libs/common';
import {
  CONTENT_ROUTINGKEYS,
  ContentPurchaseCatalogItemType,
  PurchaseCatalogResponse,
} from '@libs/contracts';
import { Controller } from '@nestjs/common';
import { RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { CollectionDocument } from '../../../infrastructure/persistence/mongo/schemas/collection.schema';
import {
  Collection as CollectionSchemaClass,
  CollectionType,
} from '../../../infrastructure/persistence/mongo/schemas/collection.schema';
import type { ResourceDocument } from '../../../infrastructure/persistence/mongo/schemas/resource.schema';
import { Resource as ResourceSchemaClass } from '../../../infrastructure/persistence/mongo/schemas/resource.schema';
import type { TutorialDocument } from '../../../infrastructure/persistence/mongo/schemas/tutorial.schema';
import { Tutorial as TutorialSchemaClass } from '../../../infrastructure/persistence/mongo/schemas/tutorial.schema';

type GetPurchaseCatalogPayload = {
  itemId: string;
  itemType: ContentPurchaseCatalogItemType;
  userId: string;
  ownedResourceIds?: string[];
  ownedTutorialIds?: string[];
};

type GetPurchaseCatalogRpcMessage = {
  payload?: GetPurchaseCatalogPayload;
  correlationId?: string;
};

/** Represents the  purchase catalog consumer component. */
@Controller()
export class PurchaseCatalogConsumer {
  private readonly logger = new AppLogger(PurchaseCatalogConsumer.name);

  constructor(
    @InjectModel(ResourceSchemaClass.name)
    private readonly resourceModel: Model<ResourceDocument>,
    @InjectModel(TutorialSchemaClass.name)
    private readonly tutorialModel: Model<TutorialDocument>,
    @InjectModel(CollectionSchemaClass.name)
    private readonly collectionModel: Model<CollectionDocument>,
  ) {}

  /**
   * Executes the handle get purchase catalog operation.
   *
   * @param message - The message parameter
   * @returns Result of type Promise<PurchaseCatalogResponse>
   */
  @RabbitRPC({
    exchange: EXCHANGES.CONTENT,
    routingKey: CONTENT_ROUTINGKEYS.GET_PURCHASE_CATALOG,
    queue: QUEUES.CONTENT_COMMANDS,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleGetPurchaseCatalog(
    message: GetPurchaseCatalogRpcMessage | GetPurchaseCatalogPayload,
  ): Promise<PurchaseCatalogResponse> {
    const payload = this.extractPayload(message);
    const ownedResourceIds = this.toOwnedIdSet(payload.ownedResourceIds);
    const ownedTutorialIds = this.toOwnedIdSet(payload.ownedTutorialIds);

    switch (payload.itemType) {
      case 'RESOURCE':
        return this.buildResourceQuote(payload.itemId);
      case 'TUTORIAL':
        return this.buildTutorialQuote(payload.itemId);
      case 'RESOURCE_COLLECTION':
        return this.buildResourceCollectionQuote(payload.itemId, ownedResourceIds);
      case 'TUTORIAL_COLLECTION':
        return this.buildTutorialCollectionQuote(payload.itemId, ownedTutorialIds);
      case 'TUTORIAL_BUNDLE':
        return this.buildTutorialBundleQuote(payload.itemId, ownedResourceIds, ownedTutorialIds);
      case 'TUTORIAL_BUNDLE_COLLECTION':
        return this.buildTutorialBundleCollectionQuote(
          payload.itemId,
          ownedResourceIds,
          ownedTutorialIds,
        );
      default:
        return { sellerId: '', priceInCents: '0', items: [] };
    }
  }

  /**
   * Executes the extract payload operation.
   *
   * @param message - The message parameter
   * @returns Result of type GetPurchaseCatalogPayload
   */
  private extractPayload(
    message: GetPurchaseCatalogRpcMessage | GetPurchaseCatalogPayload,
  ): GetPurchaseCatalogPayload {
    if ('payload' in message && message.payload) {
      return message.payload;
    }

    return message as GetPurchaseCatalogPayload;
  }

  /**
   * Executes the build resource quote operation.
   *
   * @param itemId - The itemId parameter
   * @returns Result of type Promise<PurchaseCatalogResponse>
   */
  private async buildResourceQuote(itemId: string): Promise<PurchaseCatalogResponse> {
    const resource = await this.resourceModel.findById(itemId).lean().exec();
    if (!resource || resource.deletedAt) {
      throw new Error(`Resource ${itemId} was not found`);
    }

    return {
      sellerId: resource.userId,
      priceInCents: String(resource.price),
      items: [{ itemId, itemType: 'RESOURCE', resourceIds: [itemId] }],
    };
  }

  /**
   * Executes the build tutorial quote operation.
   *
   * @param itemId - The itemId parameter
   * @returns Result of type Promise<PurchaseCatalogResponse>
   */
  private async buildTutorialQuote(itemId: string): Promise<PurchaseCatalogResponse> {
    const tutorial = await this.tutorialModel.findById(itemId).lean().exec();
    if (!tutorial || tutorial.deletedAt) {
      throw new Error(`Tutorial ${itemId} was not found`);
    }

    return {
      sellerId: tutorial.userId,
      priceInCents: String(tutorial.price),
      items: [{ itemId, itemType: 'TUTORIAL', resourceIds: [], tutorialId: itemId }],
    };
  }

  /**
   * Executes the build resource collection quote operation.
   *
   * @param itemId - The itemId parameter
   * @param ownedResourceIds - The ownedResourceIds parameter
   * @returns Result of type Promise<PurchaseCatalogResponse>
   */
  private async buildResourceCollectionQuote(
    itemId: string,
    ownedResourceIds: Set<string>,
  ): Promise<PurchaseCatalogResponse> {
    const collection = await this.collectionModel.findById(itemId).lean().exec();
    if (!collection || collection.deletedAt || collection.type !== CollectionType.RESOURCE) {
      throw new Error(`Resource collection ${itemId} was not found`);
    }

    const resources = await this.resourceModel
      .find({ collectionId: itemId, deletedAt: null })
      .lean()
      .exec();
    const remainingResources = resources.filter(
      (resource) => !ownedResourceIds.has(resource._id.toString()),
    );
    const shouldApplyDiscount = this.shouldApplyDiscount(
      resources.length,
      remainingResources.length,
    );
    const basePrice = this.sumPrices(remainingResources.map((resource) => resource.price));
    const priceInCents = shouldApplyDiscount
      ? this.applyDiscount(basePrice, collection.discount)
      : basePrice;

    return {
      sellerId: collection.userId,
      priceInCents: String(priceInCents),
      items: [
        {
          itemId,
          itemType: 'RESOURCE_COLLECTION',
          resourceIds: resources.map((resource) => resource._id.toString()),
        },
      ],
    };
  }

  /**
   * Executes the build tutorial collection quote operation.
   *
   * @param itemId - The itemId parameter
   * @param ownedTutorialIds - The ownedTutorialIds parameter
   * @returns Result of type Promise<PurchaseCatalogResponse>
   */
  private async buildTutorialCollectionQuote(
    itemId: string,
    ownedTutorialIds: Set<string>,
  ): Promise<PurchaseCatalogResponse> {
    const collection = await this.collectionModel.findById(itemId).lean().exec();
    if (!collection || collection.deletedAt || collection.type !== CollectionType.TUTORIAL) {
      throw new Error(`Tutorial collection ${itemId} was not found`);
    }

    const tutorials = await this.tutorialModel
      .find({ collectionId: itemId, deletedAt: null })
      .lean()
      .exec();
    const remainingTutorials = tutorials.filter(
      (tutorial) => !ownedTutorialIds.has(tutorial._id.toString()),
    );
    const basePrice = this.sumPrices(remainingTutorials.map((tutorial) => tutorial.price));
    const priceInCents = this.shouldApplyDiscount(tutorials.length, remainingTutorials.length)
      ? this.applyDiscount(basePrice, collection.discount)
      : basePrice;

    return {
      sellerId: collection.userId,
      priceInCents: String(priceInCents),
      items: [
        {
          itemId,
          itemType: 'TUTORIAL_COLLECTION',
          tutorialIds: tutorials.map((tutorial) => tutorial._id.toString()),
        },
      ],
    };
  }

  /**
   * Executes the build tutorial bundle quote operation.
   *
   * @param itemId - The itemId parameter
   * @param ownedResourceIds - The ownedResourceIds parameter
   * @param ownedTutorialIds - The ownedTutorialIds parameter
   * @returns Result of type Promise<PurchaseCatalogResponse>
   */
  private async buildTutorialBundleQuote(
    itemId: string,
    ownedResourceIds: Set<string>,
    ownedTutorialIds: Set<string>,
  ): Promise<PurchaseCatalogResponse> {
    const tutorial = await this.tutorialModel
      .findById(itemId)
      .populate('resources')
      .lean<{
        _id: { toString(): string };
        userId: string;
        price: number;
        discountBundle: number;
        resources?: Array<{ _id: { toString(): string }; price: number } | string>;
      }>()
      .exec();

    if (!tutorial || tutorial.discountBundle == null) {
      throw new Error(`Tutorial bundle ${itemId} was not found`);
    }

    const remainingResourcePrices = this.extractRemainingResourcePrices(
      tutorial.resources,
      ownedResourceIds,
    );
    const resourceCount = this.extractResourceIds(tutorial.resources).length;
    const shouldApplyDiscount = this.shouldApplyDiscount(
      resourceCount,
      remainingResourcePrices.length,
    );
    const basePrice =
      (ownedTutorialIds.has(itemId) ? 0 : tutorial.price) + this.sumPrices(remainingResourcePrices);
    const priceInCents = shouldApplyDiscount
      ? this.applyDiscount(basePrice, tutorial.discountBundle)
      : basePrice;

    return {
      sellerId: tutorial.userId,
      priceInCents: String(priceInCents),
      items: [
        {
          itemId,
          itemType: 'TUTORIAL_BUNDLE',
          tutorialId: itemId,
          resourceIds: this.extractResourceIds(tutorial.resources),
        },
      ],
    };
  }

  /**
   * Executes the build tutorial bundle collection quote operation.
   *
   * @param itemId - The itemId parameter
   * @param ownedResourceIds - The ownedResourceIds parameter
   * @param ownedTutorialIds - The ownedTutorialIds parameter
   * @returns Result of type Promise<PurchaseCatalogResponse>
   */
  private async buildTutorialBundleCollectionQuote(
    itemId: string,
    ownedResourceIds: Set<string>,
    ownedTutorialIds: Set<string>,
  ): Promise<PurchaseCatalogResponse> {
    const collection = await this.collectionModel.findById(itemId).lean().exec();
    if (!collection || collection.deletedAt || collection.type !== CollectionType.TUTORIAL) {
      throw new Error(`Tutorial bundle collection ${itemId} was not found`);
    }

    const tutorials = await this.tutorialModel
      .find({ collectionId: itemId, deletedAt: null })
      .populate('resources')
      .lean<
        {
          _id: { toString(): string };
          userId: string;
          price: number;
          discountBundle: number;
          resources?: Array<{ _id: { toString(): string }; price: number } | string>;
        }[]
      >()
      .exec();
    const tutorialPrices = tutorials.map((tutorial) => {
      const remainingResourcePrices = this.extractRemainingResourcePrices(
        tutorial.resources,
        ownedResourceIds,
      );
      const basePrice =
        (ownedTutorialIds.has(tutorial._id.toString()) ? 0 : tutorial.price) +
        this.sumPrices(remainingResourcePrices);

      return this.shouldApplyDiscount(
        this.extractResourceIds(tutorial.resources).length,
        remainingResourcePrices.length,
      )
        ? this.applyDiscount(basePrice, tutorial.discountBundle)
        : basePrice;
    });
    const remainingTutorials = tutorials.filter(
      (tutorial) => !ownedTutorialIds.has(tutorial._id.toString()),
    );
    const subtotal = this.sumPrices(tutorialPrices);
    const priceInCents = this.shouldApplyDiscount(tutorials.length, remainingTutorials.length)
      ? this.applyDiscount(subtotal, collection.discount)
      : subtotal;

    return {
      sellerId: collection.userId,
      priceInCents: String(priceInCents),
      items: [
        {
          itemId,
          itemType: 'TUTORIAL_BUNDLE_COLLECTION',
          tutorialIds: tutorials.map((tutorial) => tutorial._id.toString()),
          resourceIds: Array.from(
            new Set(tutorials.flatMap((tutorial) => this.extractResourceIds(tutorial.resources))),
          ),
        },
      ],
    };
  }

  /**
   * Executes the extract resource ids operation.
   *
   * @param value - The value parameter
   * @returns Result of type string[]
   */
  private extractResourceIds(
    value?: Array<{ _id: { toString(): string } } | string> | null,
  ): string[] {
    if (!value || value.length === 0) {
      return [];
    }

    return value.map((item) => (typeof item === 'string' ? item : item._id.toString()));
  }

  /**
   * Executes the extract resource prices operation.
   *
   * @param value - The value parameter
   * @returns Result of type number[]
   */
  private extractResourcePrices(
    value?: Array<{ _id: { toString(): string }; price: number } | string> | null,
  ): number[] {
    if (!value || value.length === 0) {
      return [];
    }

    return value
      .map((item) => (typeof item === 'string' ? 0 : (item.price ?? 0)))
      .filter((price) => price >= 0);
  }

  /**
   * Executes the extract remaining resource prices operation.
   *
   * @param value - The value parameter
   * @param ownedResourceIds - The ownedResourceIds parameter
   * @returns Result of type number[]
   */
  private extractRemainingResourcePrices(
    value?: Array<{ _id: { toString(): string }; price: number } | string> | null,
    ownedResourceIds?: Set<string>,
  ): number[] {
    if (!value || value.length === 0) {
      return [];
    }

    return value
      .filter((item) => {
        if (typeof item === 'string') {
          return !ownedResourceIds?.has(item);
        }

        return !ownedResourceIds?.has(item._id.toString());
      })
      .map((item) => (typeof item === 'string' ? 0 : (item.price ?? 0)))
      .filter((price) => price >= 0);
  }

  /**
   * Executes the to owned id set operation.
   *
   * @param value - The value parameter
   * @returns Result of type Set<string>
   */
  private toOwnedIdSet(value?: string[]): Set<string> {
    return new Set(
      (value || []).filter((item): item is string => typeof item === 'string' && item.length > 0),
    );
  }

  /**
   * Executes the should apply discount operation.
   *
   * @param totalCount - The totalCount parameter
   * @param unownedCount - The unownedCount parameter
   * @returns Result of type boolean
   */
  private shouldApplyDiscount(totalCount: number, unownedCount: number): boolean {
    if (totalCount <= 0) {
      return false;
    }

    return unownedCount / totalCount > 0.7;
  }

  /**
   * Executes the sum prices operation.
   *
   * @param prices - The prices parameter
   * @returns Result of type number
   */
  private sumPrices(prices: number[]): number {
    return prices.reduce((sum, price) => sum + price, 0);
  }

  /**
   * Executes the apply discount operation.
   *
   * @param price - The price parameter
   * @param discount - The discount parameter
   * @returns Result of type number
   */
  private applyDiscount(price: number, discount: number): number {
    const clampedDiscount = Math.max(0, Math.min(100, discount));
    return Math.max(0, Math.floor((price * (100 - clampedDiscount)) / 100));
  }
}
