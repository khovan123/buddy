/// <reference types="jest" />

import 'reflect-metadata';

import {
  PoliciesGuard,
  type PolicyContext,
  type PolicyHandler,
  POLICIES_KEY,
} from '@libs/common';
import { SubscriptionPlan } from '@libs/contracts';
import type { ExecutionContext } from '@nestjs/common';
import type { ModuleRef, Reflector } from '@nestjs/core';

class CapturePolicy implements PolicyHandler {
  handle(_context: PolicyContext): boolean {
    return true;
  }
}

describe('PoliciesGuard', () => {
  const createGuard = (handle: jest.Mock) => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => (key === POLICIES_KEY ? [CapturePolicy] : [])),
    } as unknown as Reflector;
    const moduleRef = {
      resolve: jest.fn().mockResolvedValue({ handle }),
    } as unknown as ModuleRef;

    return new PoliciesGuard(reflector, moduleRef);
  };

  const createContext = (user: {
    sub: string;
    roles?: string[];
    subscriptionPlan?: string;
  }): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          body: {},
          headers: {},
          params: {},
          query: {},
        }),
      }),
    }) as unknown as ExecutionContext;

  it('normalizes creator plan claims before resolving limits', async () => {
    const handle = jest.fn().mockReturnValue(true);
    const guard = createGuard(handle);

    await guard.canActivate(
      createContext({
        sub: 'user-1',
        roles: ['user'],
        subscriptionPlan: 'creator-free',
      }),
    );

    expect(handle).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionPlan: SubscriptionPlan.CREATOR_FREE,
        planLimits: expect.objectContaining({ canCreateContent: true }),
      }),
    );
  });

  it('uses creator access when a creator role has a stale student plan claim', async () => {
    const handle = jest.fn().mockReturnValue(true);
    const guard = createGuard(handle);

    await guard.canActivate(
      createContext({
        sub: 'user-1',
        roles: ['creator'],
        subscriptionPlan: SubscriptionPlan.STUDENT_FREE,
      }),
    );

    expect(handle).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionPlan: SubscriptionPlan.CREATOR_FREE,
        planLimits: expect.objectContaining({ canCreateContent: true }),
      }),
    );
  });

  it('keeps student plans student-only when there is no creator role', async () => {
    const handle = jest.fn().mockReturnValue(true);
    const guard = createGuard(handle);

    await guard.canActivate(
      createContext({
        sub: 'user-1',
        roles: ['user'],
        subscriptionPlan: SubscriptionPlan.STUDENT_PRO,
      }),
    );

    expect(handle).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionPlan: SubscriptionPlan.STUDENT_PRO,
        planLimits: expect.objectContaining({ canCreateContent: false }),
      }),
    );
  });
});
