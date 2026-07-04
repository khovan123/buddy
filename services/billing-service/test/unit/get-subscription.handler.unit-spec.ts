/// <reference types="jest" />

import 'reflect-metadata';
import { SubscriptionPlan } from '@libs/contracts';

import { GetSubscriptionHandler } from '../../src/application/queries/handlers/get-subscription.handler';
import { GetSubscriptionQuery } from '../../src/application/queries/get-subscription.query';

describe('GetSubscriptionHandler', () => {
  const createRepo = () => ({
    findActiveSubscription: jest.fn(),
    upsertSubscription: jest.fn(),
  });

  it('returns the active subscription when it already exists', async () => {
    const subscription = {
      id: 'sub-1',
      userId: 'user-1',
      plan: SubscriptionPlan.CREATOR_PRO,
      status: 'ACTIVE',
      startsAt: new Date(),
      expiresAt: null,
    };
    const repo = createRepo();
    repo.findActiveSubscription.mockResolvedValue(subscription);
    const handler = new GetSubscriptionHandler(repo as never);

    await expect(handler.execute(new GetSubscriptionQuery('user-1'))).resolves.toBe(subscription);
    expect(repo.upsertSubscription).not.toHaveBeenCalled();
  });

  it('provisions STUDENT_FREE when the user has no active subscription yet', async () => {
    const subscription = {
      id: 'sub-1',
      userId: 'user-1',
      plan: SubscriptionPlan.STUDENT_FREE,
      status: 'ACTIVE',
      startsAt: new Date(),
      expiresAt: null,
    };
    const repo = createRepo();
    repo.findActiveSubscription.mockResolvedValue(null);
    repo.upsertSubscription.mockResolvedValue(subscription);
    const handler = new GetSubscriptionHandler(repo as never);

    await expect(handler.execute(new GetSubscriptionQuery('user-1'))).resolves.toBe(subscription);
    expect(repo.upsertSubscription).toHaveBeenCalledWith({
      userId: 'user-1',
      plan: SubscriptionPlan.STUDENT_FREE,
    });
  });
});
