import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { InteractionEntity } from '../../../../domain/entities/interaction.entity';
import type { IInteractionRepository } from '../../../../domain/repositories/interaction.repository.interface';
import type { InteractionContentType, InteractionStatsPayload } from '@libs/contracts';
import { InteractionAction } from '@libs/contracts';
import { Interaction, InteractionDocument } from '../schemas/interaction.schema';

@Injectable()
export class InteractionMongoRepository implements IInteractionRepository {
  constructor(@InjectModel(Interaction.name) private readonly model: Model<InteractionDocument>) {}

  async create(entity: InteractionEntity): Promise<void> {
    await this.model.create({
      userId: entity.userId,
      itemId: entity.itemId,
      itemType: entity.itemType,
      action: entity.action,
      weight: entity.weight,
      metadata: entity.metadata,
    });
  }

  async getStatsForItem(params: {
    itemId: string;
    itemType: InteractionContentType;
    userId?: string;
  }): Promise<InteractionStatsPayload> {
    const [stats] = await this.getStatsForItems({
      items: [{ itemId: params.itemId, itemType: params.itemType }],
      userId: params.userId,
    });

    return stats ?? this.emptyStats(params.itemId, params.itemType, false);
  }

  async getStatsForItems(params: {
    items: Array<{ itemId: string; itemType: InteractionContentType }>;
    userId?: string;
  }): Promise<InteractionStatsPayload[]> {
    if (params.items.length === 0) {
      return [];
    }

    const itemKeys = params.items.map((item) => `${item.itemType}:${item.itemId}`);
    const itemKeySet = new Set(itemKeys);
    const match = {
      $or: params.items.map((item) => ({
        itemId: item.itemId,
        itemType: item.itemType,
      })),
    };

    const [aggregateRows, likedRows] = await Promise.all([
      this.model
        .aggregate<{
          _id: { itemId: string; itemType: InteractionContentType };
          viewCount: number;
          likeCount: number;
          unlikeCount: number;
          purchaseCount: number;
          commentCount: number;
          downloadCount: number;
          ratingCount: number;
          ratingSum: number;
        }>([
          { $match: match },
          {
            $group: {
              _id: { itemId: '$itemId', itemType: '$itemType' },
              viewCount: {
                $sum: { $cond: [{ $eq: ['$action', InteractionAction.VIEW_PREVIEW] }, 1, 0] },
              },
              likeCount: {
                $sum: { $cond: [{ $eq: ['$action', InteractionAction.LIKE] }, 1, 0] },
              },
              unlikeCount: {
                $sum: { $cond: [{ $eq: ['$action', InteractionAction.UNLIKE] }, 1, 0] },
              },
              purchaseCount: {
                $sum: { $cond: [{ $eq: ['$action', InteractionAction.PURCHASE] }, 1, 0] },
              },
              commentCount: {
                $sum: { $cond: [{ $eq: ['$action', InteractionAction.COMMENT] }, 1, 0] },
              },
              downloadCount: {
                $sum: { $cond: [{ $eq: ['$action', InteractionAction.DOWNLOAD] }, 1, 0] },
              },
              ratingCount: {
                $sum: { $cond: [{ $eq: ['$action', InteractionAction.RATING] }, 1, 0] },
              },
              ratingSum: {
                $sum: {
                  $cond: [
                    { $eq: ['$action', InteractionAction.RATING] },
                    { $ifNull: ['$metadata.ratingValue', 0] },
                    0,
                  ],
                },
              },
            },
          },
        ])
        .exec(),
      params.userId
        ? this.model
            .aggregate<{
              _id: { itemId: string; itemType: InteractionContentType };
              action: InteractionAction;
            }>([
              {
                $match: {
                  ...match,
                  userId: params.userId,
                  action: { $in: [InteractionAction.LIKE, InteractionAction.UNLIKE] },
                },
              },
              { $sort: { createdAt: -1 } },
              {
                $group: {
                  _id: { itemId: '$itemId', itemType: '$itemType' },
                  action: { $first: '$action' },
                },
              },
            ])
            .exec()
        : Promise.resolve([]),
    ]);

    const likedByKey = new Map(
      likedRows.map((row) => [
        `${row._id.itemType}:${row._id.itemId}`,
        row.action === InteractionAction.LIKE,
      ]),
    );

    const statsByKey = new Map<string, InteractionStatsPayload>();
    for (const row of aggregateRows) {
      const key = `${row._id.itemType}:${row._id.itemId}`;
      if (!itemKeySet.has(key)) {
        continue;
      }

      const ratingAverage = row.ratingCount > 0 ? row.ratingSum / row.ratingCount : 0;
      statsByKey.set(key, {
        itemId: row._id.itemId,
        itemType: row._id.itemType,
        viewCount: row.viewCount,
        likeCount: Math.max(row.likeCount - row.unlikeCount, 0),
        purchaseCount: row.purchaseCount,
        commentCount: row.commentCount,
        downloadCount: row.downloadCount,
        ratingCount: row.ratingCount,
        ratingAverage,
        likedByCurrentUser: likedByKey.get(key) ?? false,
      });
    }

    return params.items.map((item) => {
      const key = `${item.itemType}:${item.itemId}`;
      return (
        statsByKey.get(key) ??
        this.emptyStats(item.itemId, item.itemType, likedByKey.get(key) ?? false)
      );
    });
  }

  private emptyStats(
    itemId: string,
    itemType: InteractionContentType,
    likedByCurrentUser: boolean,
  ): InteractionStatsPayload {
    return {
      itemId,
      itemType,
      viewCount: 0,
      likeCount: 0,
      purchaseCount: 0,
      commentCount: 0,
      downloadCount: 0,
      ratingCount: 0,
      ratingAverage: 0,
      likedByCurrentUser,
    };
  }
}
