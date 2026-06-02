/// <reference types="jest" />

import { GetPurchasedContentIdsHandler } from '../../src/application/queries/handlers/get-purchased-content-ids.handler';
import { GetPurchasedContentIdsQuery } from '../../src/application/queries/get-purchased-content-ids.query';

describe('GetPurchasedContentIdsHandler', () => {
  it('returns unique projected content ids for the current buyer', async () => {
    const exec = jest
      .fn()
      .mockResolvedValue([
        { itemId: 'resource-1' },
        { itemId: 'resource-1' },
        { itemId: 'tutorial-1' },
      ]);
    const savedContentModel = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec }),
      }),
    };
    const handler = new GetPurchasedContentIdsHandler(savedContentModel as never);

    await expect(handler.execute(new GetPurchasedContentIdsQuery('buyer-1'))).resolves.toEqual([
      'resource-1',
      'tutorial-1',
    ]);
    expect(savedContentModel.find).toHaveBeenCalledWith({ userId: 'buyer-1' }, { itemId: 1 });
  });
});
