import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SavedContent } from '../../../infrastructure/persistence/mongo/schemas/saved-content.schema';
import { GetPurchasedContentIdsQuery } from '../get-purchased-content-ids.query';

/** Returns every projected content ID a buyer already owns. */
@QueryHandler(GetPurchasedContentIdsQuery)
export class GetPurchasedContentIdsHandler implements IQueryHandler<GetPurchasedContentIdsQuery> {
  constructor(
    @InjectModel(SavedContent.name)
    private readonly savedContentModel: Model<SavedContent>,
  ) {}

  async execute(query: GetPurchasedContentIdsQuery): Promise<string[]> {
    const rows = await this.savedContentModel
      .find({ userId: query.userId }, { itemId: 1 })
      .lean<Array<{ itemId: string }>>()
      .exec();

    return Array.from(new Set(rows.map((row) => row.itemId)));
  }
}
