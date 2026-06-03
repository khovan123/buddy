/// <reference types="jest" />

import 'reflect-metadata';

import { Nack } from '@golevelup/nestjs-rabbitmq';
import { SubscriptionPlan } from '@libs/contracts';
import { UpdateSubscriptionPlanCommand } from '../../src/application/commands/update-subscription-plan.command';
import { MESSAGE_COMPONENTS } from '../../src/infrastructure/messaging/message.module';
import { SubscriptionChangedConsumer } from '../../src/infrastructure/messaging/consumers/subscription-changed.consumer';

type CommandBusMock = ConstructorParameters<typeof SubscriptionChangedConsumer>[0] & {
  execute: jest.Mock;
};

const createCommandBus = (): CommandBusMock =>
  ({
    execute: jest.fn().mockResolvedValue(undefined),
  }) as CommandBusMock;

describe('SubscriptionChangedConsumer', () => {
  it('syncs billing subscription changes into auth user subscription plan', async () => {
    const commandBus = createCommandBus();
    const consumer = new SubscriptionChangedConsumer(commandBus);

    await consumer.handleSubscriptionChanged({
      correlationId: 'corr-1',
      payload: {
        userId: 'user-1',
        plan: SubscriptionPlan.CREATOR_FREE,
        previousPlan: null,
        changedAt: '2026-06-03T01:00:00.000Z',
      },
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new UpdateSubscriptionPlanCommand('user-1', SubscriptionPlan.CREATOR_FREE, 'corr-1'),
    );
  });

  it('falls back to user id as correlation id when the event has none', async () => {
    const commandBus = createCommandBus();
    const consumer = new SubscriptionChangedConsumer(commandBus);

    await consumer.handleSubscriptionChanged({
      payload: {
        userId: 'user-1',
        plan: SubscriptionPlan.CREATOR_PRO,
        previousPlan: SubscriptionPlan.CREATOR_FREE,
        changedAt: '2026-06-03T01:00:00.000Z',
      },
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      new UpdateSubscriptionPlanCommand('user-1', SubscriptionPlan.CREATOR_PRO, 'user-1'),
    );
  });

  it('drops malformed events without executing the command', async () => {
    const commandBus = createCommandBus();
    const consumer = new SubscriptionChangedConsumer(commandBus);

    const result = await consumer.handleSubscriptionChanged({
      correlationId: 'corr-1',
      payload: {
        userId: '',
        plan: '',
        previousPlan: null,
        changedAt: '2026-06-03T01:00:00.000Z',
      },
    });

    expect(commandBus.execute).not.toHaveBeenCalled();
    expect(result).toBeInstanceOf(Nack);
    expect(result).toEqual(expect.objectContaining({ requeue: false }));
  });

  it('is registered with auth messaging components', () => {
    expect(MESSAGE_COMPONENTS).toContain(SubscriptionChangedConsumer);
  });
});
