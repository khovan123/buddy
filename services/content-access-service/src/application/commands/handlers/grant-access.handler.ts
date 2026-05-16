/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { GrantAccessCommand } from '../grant-access.command';

/** CQRS Handler to execute  grant access. */
@CommandHandler(GrantAccessCommand)
@Injectable()
export class GrantAccessHandler implements ICommandHandler<GrantAccessCommand> {
  private readonly logger = new Logger(GrantAccessHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executes the execute operation.
   *
   * @param command - The command parameter
   * @returns Result of type Promise<{ grantedCount: number }>
   */
  async execute(command: GrantAccessCommand): Promise<{ grantedCount: number }> {
    let grantedCount = 0;

    await this.prisma.client.$transaction(async (tx) => {
      for (const item of command.purchasedItems) {
        if (item.itemType === 'RESOURCE') {
          grantedCount += await this.grantMany(
            tx,
            command.userId,
            command.purchaseId,
            item.resourceIds,
            'RESOURCE',
          );
          continue;
        }

        if (item.itemType === 'RESOURCE_COLLECTION') {
          grantedCount += await this.grantCollection(
            tx,
            command.userId,
            command.purchaseId,
            item.itemId,
            item.resourceIds,
            'RESOURCE',
          );
          continue;
        }

        if (item.itemType === 'TUTORIAL') {
          const tutorialId = item.tutorialId || item.itemId;
          grantedCount += await this.grantOne(
            tx,
            command.userId,
            command.purchaseId,
            tutorialId,
            'TUTORIAL',
          );
          continue;
        }

        if (item.itemType === 'TUTORIAL_COLLECTION') {
          grantedCount += await this.grantCollection(
            tx,
            command.userId,
            command.purchaseId,
            item.itemId,
            item.tutorialIds || [],
            'TUTORIAL',
          );
          continue;
        }

        if (item.itemType === 'TUTORIAL_BUNDLE') {
          if (item.tutorialId) {
            grantedCount += await this.grantOne(
              tx,
              command.userId,
              command.purchaseId,
              item.tutorialId,
              'TUTORIAL',
            );
          }

          grantedCount += await this.grantMany(
            tx,
            command.userId,
            command.purchaseId,
            item.resourceIds,
            'RESOURCE',
          );
          continue;
        }

        if (item.itemType === 'TUTORIAL_BUNDLE_COLLECTION') {
          grantedCount += await this.grantCollection(
            tx,
            command.userId,
            command.purchaseId,
            item.itemId,
            item.tutorialIds || [],
            'TUTORIAL',
          );

          grantedCount += await this.grantMany(
            tx,
            command.userId,
            command.purchaseId,
            item.resourceIds,
            'RESOURCE',
          );
          continue;
        }

        if (item.itemType === 'COLLECTION') {
          grantedCount += await this.grantCollection(
            tx,
            command.userId,
            command.purchaseId,
            item.itemId,
            item.resourceIds,
            'RESOURCE',
          );
          continue;
        }

        if (item.itemType === 'BUNDLE') {
          if (item.tutorialId) {
            grantedCount += await this.grantOne(
              tx,
              command.userId,
              command.purchaseId,
              item.tutorialId,
              'TUTORIAL',
            );
          }

          grantedCount += await this.grantMany(
            tx,
            command.userId,
            command.purchaseId,
            item.resourceIds,
            'RESOURCE',
          );
        }
      }
    });

    this.logger.log(
      `Granted access for purchase ${command.purchaseId} to user ${command.userId} (${grantedCount} records)`,
    );

    return { grantedCount };
  }

  /**
   * Executes the grant one operation.
   *
   * @param tx - The tx parameter
   * @param userId - The userId parameter
   * @param resourceId - The resourceId parameter
   * @param resourceType - The resourceType parameter
   * @returns Result of type Promise<number>
   */
  private async grantOne(
    tx: Parameters<GrantAccessHandler['execute']>[0] extends never ? never : any,
    userId: string,
    purchaseId: string,
    resourceId: string,
    resourceType: 'RESOURCE' | 'COLLECTION' | 'TUTORIAL',
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

  /**
   * Executes the grant many operation.
   *
   * @param tx - The tx parameter
   * @param userId - The userId parameter
   * @param resourceIds - The resourceIds parameter
   * @param resourceType - The resourceType parameter
   * @returns Result of type Promise<number>
   */
  private async grantMany(
    tx: Parameters<GrantAccessHandler['execute']>[0] extends never ? never : any,
    userId: string,
    purchaseId: string,
    resourceIds: string[] | undefined,
    resourceType: 'RESOURCE' | 'COLLECTION' | 'TUTORIAL',
  ): Promise<number> {
    if (!resourceIds || resourceIds.length === 0) {
      return 0;
    }

    let grantedCount = 0;
    for (const resourceId of resourceIds) {
      await this.grantOne(tx, userId, purchaseId, resourceId, resourceType);
      grantedCount += 1;
    }

    return grantedCount;
  }

  /**
   * Executes the grant collection operation.
   *
   * @param tx - The tx parameter
   * @param userId - The userId parameter
   * @param collectionId - The collectionId parameter
   * @param itemIds - The itemIds parameter
   * @param childResourceType - The childResourceType parameter
   * @returns Result of type Promise<number>
   */
  private async grantCollection(
    tx: Parameters<GrantAccessHandler['execute']>[0] extends never ? never : any,
    userId: string,
    purchaseId: string,
    collectionId: string,
    itemIds: string[] | undefined,
    childResourceType: 'RESOURCE' | 'TUTORIAL',
  ): Promise<number> {
    let grantedCount = await this.grantOne(tx, userId, purchaseId, collectionId, 'COLLECTION');
    grantedCount += await this.grantMany(tx, userId, purchaseId, itemIds, childResourceType);

    return grantedCount;
  }
}
