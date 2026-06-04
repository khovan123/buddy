/// <reference types="jest" />

import 'reflect-metadata';

import { DEFAULT_PLAN_LIMITS, SubscriptionPlan, type PlanLimits } from '@libs/contracts';
import { CreatorOnlyPolicy } from '@libs/common';

describe('CreatorOnlyPolicy', () => {
  const policy = new CreatorOnlyPolicy();

  it('allows Creator Free users even when their auth role is the default user role', () => {
    expect(
      policy.handle({
        userId: 'user-1',
        roles: ['user'],
        subscriptionPlan: SubscriptionPlan.CREATOR_FREE,
        planLimits: { ...DEFAULT_PLAN_LIMITS, canCreateContent: true },
        extras: {},
      }),
    ).toBe(true);
  });

  it('allows content creation from the resolved plan limit instead of hard-coded plan names', () => {
    const planLimits: PlanLimits = {
      ...DEFAULT_PLAN_LIMITS,
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
        planLimits: DEFAULT_PLAN_LIMITS,
        extras: {},
      }),
    ).toBe(false);
  });
});
