import 'reflect-metadata';

import type { PlanLimits } from '@libs/contracts';
import { SubscriptionPlan, getPlanLimits } from '@libs/contracts';
import { CreatorOnlyPolicy } from '@libs/common';

describe('CreatorOnlyPolicy', () => {
  const policy = new CreatorOnlyPolicy();

  it('allows Creator Free users even when their auth role is the default user role', () => {
    expect(
      policy.handle({
        userId: 'user-1',
        roles: ['user'],
        subscriptionPlan: SubscriptionPlan.CREATOR_FREE,
        planLimits: getPlanLimits(SubscriptionPlan.CREATOR_FREE),
        extras: {},
      }),
    ).toBe(true);
  });

  it('allows content creation from the resolved plan limit instead of hard-coded plan names', () => {
    const planLimits: PlanLimits = {
      ...getPlanLimits(SubscriptionPlan.STUDENT_FREE),
      canCreateContent: true,
    };

    expect(
      policy.handle({
        userId: 'user-1',
        roles: ['user'],
        subscriptionPlan: SubscriptionPlan.STUDENT_FREE,
        planLimits,
        extras: {},
      }),
    ).toBe(true);
  });

  it('keeps Student Free users blocked from content creation', () => {
    expect(
      policy.handle({
        userId: 'user-1',
        roles: ['user'],
        subscriptionPlan: SubscriptionPlan.STUDENT_FREE,
        planLimits: getPlanLimits(SubscriptionPlan.STUDENT_FREE),
        extras: {},
      }),
    ).toBe(false);
  });
});
