/// <reference types="jest" />

jest.mock('../../src/infrastructure/persistence/prisma/prisma.service', () => ({
  PrismaService: class {},
}));

import { Nack } from '@golevelup/nestjs-rabbitmq';
import { SubscriptionPlan } from '@libs/contracts';

import { UserRegisteredConsumer } from '../../src/infrastructure/messaging/consumers/user-registered.consumer';
import { MESSAGE_COMPONENTS } from '../../src/infrastructure/messaging/message.module';

describe('UserRegisteredConsumer', () => {
  beforeAll(() => {
    process.env.LOG_LEVEL ??= 'debug';
    process.env.SERVICE_NAME ??= 'billing-service';
    process.env.NODE_ENV ??= 'test';
  });

  const createConsumer = (client: {
    subscription: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  }) => new UserRegisteredConsumer({ client } as never);

  it('is registered for RabbitMQ provider discovery', () => {
    expect(MESSAGE_COMPONENTS).toContain(UserRegisteredConsumer);
  });

  it('creates a default STUDENT_FREE subscription from auth user registration events', async () => {
    const client = {
      subscription: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'sub-1' }),
      },
    };
    const consumer = createConsumer(client);

    await expect(
      consumer.handleUserRegistered({
        payload: {
          userId: 'user-1',
          email: 'student@example.com',
          nickname: 'Student',
          registeredAt: new Date(),
        },
      }),
    ).resolves.toBeUndefined();

    expect(client.subscription.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { id: true },
    });
    expect(client.subscription.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        plan: SubscriptionPlan.STUDENT_FREE,
        status: 'ACTIVE',
      },
    });
  });

  it('does not overwrite an existing subscription', async () => {
    const client = {
      subscription: {
        findUnique: jest.fn().mockResolvedValue({ id: 'sub-1' }),
        create: jest.fn(),
      },
    };
    const consumer = createConsumer(client);

    await expect(
      consumer.handleUserRegistered({
        userId: 'user-1',
        email: 'student@example.com',
        nickname: 'Student',
        registeredAt: new Date(),
      }),
    ).resolves.toBeUndefined();

    expect(client.subscription.create).not.toHaveBeenCalled();
  });

  it('nacks malformed auth registration events without requeueing', async () => {
    const client = {
      subscription: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    const consumer = createConsumer(client);

    await expect(
      consumer.handleUserRegistered({ payload: { userId: '' } } as never),
    ).resolves.toEqual(expect.any(Nack));
    expect(client.subscription.findUnique).not.toHaveBeenCalled();
  });
});
