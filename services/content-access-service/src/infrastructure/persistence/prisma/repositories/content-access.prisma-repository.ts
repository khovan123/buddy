/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { ContentAccess } from '../../../../domain/entities/content-access.entity';
import type {
  ContentAccessGrantInput,
  GrantAccessItem,
  IContentAccessRepository,
} from '../../../../domain/repositories/content-access.repository.interfaces';
import type { ContentAccessResourceType } from '../../../../domain/value-objects/content-access-resource-type.vo';
import { PrismaService } from '../prisma.service';

type AccessRow = {
  id?: string;
  userId: string;
  resourceId: string;
  resourceType: ContentAccessResourceType;
  purchaseId: string | null;
  grantedAt: Date;
  deletedAt?: Date | null;
};

@Injectable()
export class ContentAccessPrismaRepository implements IContentAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async hasAccess(userId: string, resourceId: string): Promise<boolean> {
    const access = await this.prisma.client.userResourceAccess.findFirst({
      where: {
        userId,
        resourceId,
        deletedAt: null,
      },
      select: { id: true },
    });

    return !!access;
  }

  async listByUserId(userId: string): Promise<ContentAccess[]> {
    const rows = await this.prisma.client.userResourceAccess.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: {
        grantedAt: 'desc',
      },
      select: {
        id: true,
        userId: true,
        resourceId: true,
        resourceType: true,
        purchaseId: true,
        grantedAt: true,
        deletedAt: true,
      },
    });

    return rows.map((row) => this.toDomain(row));
  }

  async grantForPurchase(input: ContentAccessGrantInput): Promise<{ grantedCount: number }> {
    let grantedCount = 0;

    await this.prisma.client.$transaction(async (tx) => {
      for (const item of input.purchasedItems) {
        grantedCount += await this.grantPurchasedItem(tx, input.userId, input.purchaseId, item);
      }
    });

    return { grantedCount };
  }

  async revokeByPurchase(userId: string, purchaseId: string): Promise<number> {
    const { count } = await this.prisma.client.userResourceAccess.updateMany({
      where: {
        userId,
        purchaseId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return count;
  }

  private async grantPurchasedItem(
    tx: any,
    userId: string,
    purchaseId: string,
    item: GrantAccessItem,
  ): Promise<number> {
    if (item.itemType === 'RESOURCE') {
      return this.grantMany(tx, userId, purchaseId, item.resourceIds, 'RESOURCE');
    }

    if (item.itemType === 'RESOURCE_COLLECTION') {
      return this.grantCollection(
        tx,
        userId,
        purchaseId,
        item.itemId,
        item.resourceIds,
        'RESOURCE',
      );
    }

    if (item.itemType === 'TUTORIAL') {
      return this.grantOne(tx, userId, purchaseId, item.tutorialId || item.itemId, 'TUTORIAL');
    }

    if (item.itemType === 'TUTORIAL_COLLECTION') {
      return this.grantCollection(
        tx,
        userId,
        purchaseId,
        item.itemId,
        item.tutorialIds || [],
        'TUTORIAL',
      );
    }

    if (item.itemType === 'TUTORIAL_BUNDLE') {
      let grantedCount = 0;
      if (item.tutorialId) {
        grantedCount += await this.grantOne(tx, userId, purchaseId, item.tutorialId, 'TUTORIAL');
      }
      grantedCount += await this.grantMany(tx, userId, purchaseId, item.resourceIds, 'RESOURCE');
      return grantedCount;
    }

    if (item.itemType === 'TUTORIAL_BUNDLE_COLLECTION') {
      let grantedCount = await this.grantCollection(
        tx,
        userId,
        purchaseId,
        item.itemId,
        item.tutorialIds || [],
        'TUTORIAL',
      );
      grantedCount += await this.grantMany(tx, userId, purchaseId, item.resourceIds, 'RESOURCE');
      return grantedCount;
    }

    if (item.itemType === 'COLLECTION') {
      return this.grantCollection(
        tx,
        userId,
        purchaseId,
        item.itemId,
        item.resourceIds,
        'RESOURCE',
      );
    }

    if (item.itemType === 'BUNDLE') {
      let grantedCount = 0;
      if (item.tutorialId) {
        grantedCount += await this.grantOne(tx, userId, purchaseId, item.tutorialId, 'TUTORIAL');
      }
      grantedCount += await this.grantMany(tx, userId, purchaseId, item.resourceIds, 'RESOURCE');
      return grantedCount;
    }

    return 0;
  }

  private async grantOne(
    tx: any,
    userId: string,
    purchaseId: string,
    resourceId: string,
    resourceType: ContentAccessResourceType,
  ): Promise<number> {
    await tx.userResourceAccess.upsert({
      where: {
        userId_resourceId: {
          userId,
          resourceId,
        },
      },
      update: {
        resourceType,
        purchaseId,
        deletedAt: null,
      },
      create: {
        userId,
        resourceId,
        resourceType,
        purchaseId,
      },
    });

    return 1;
  }

  private async grantMany(
    tx: any,
    userId: string,
    purchaseId: string,
    resourceIds: string[] | undefined,
    resourceType: ContentAccessResourceType,
  ): Promise<number> {
    if (!resourceIds || resourceIds.length === 0) {
      return 0;
    }

    let grantedCount = 0;
    for (const resourceId of resourceIds) {
      grantedCount += await this.grantOne(tx, userId, purchaseId, resourceId, resourceType);
    }

    return grantedCount;
  }

  private async grantCollection(
    tx: any,
    userId: string,
    purchaseId: string,
    collectionId: string,
    itemIds: string[] | undefined,
    childResourceType: Extract<ContentAccessResourceType, 'RESOURCE' | 'TUTORIAL'>,
  ): Promise<number> {
    let grantedCount = await this.grantOne(tx, userId, purchaseId, collectionId, 'COLLECTION');
    grantedCount += await this.grantMany(tx, userId, purchaseId, itemIds, childResourceType);

    return grantedCount;
  }

  private toDomain(row: AccessRow): ContentAccess {
    return ContentAccess.reconstitute({
      id: row.id,
      userId: row.userId,
      resourceId: row.resourceId,
      resourceType: row.resourceType,
      purchaseId: row.purchaseId,
      grantedAt: row.grantedAt,
      deletedAt: row.deletedAt,
    });
  }
}
