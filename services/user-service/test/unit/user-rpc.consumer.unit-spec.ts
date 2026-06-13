/// <reference types="jest" />

import 'reflect-metadata';

import { Nack } from '@golevelup/nestjs-rabbitmq';
import { AppLogger } from '@libs/common';

import { USER_REPOSITORY } from '../../src/domain/repositories/tokens';
import { UserRpcController } from '../../src/infrastructure/messaging/consumers/user.rpc';
import { MESSAGE_COMPONENTS } from '../../src/infrastructure/messaging/message.module';

describe('UserRpcController', () => {
  beforeAll(() => {
    process.env.LOG_LEVEL ??= 'debug';
    process.env.SERVICE_NAME ??= 'user-service';
    process.env.NODE_ENV ??= 'test';
  });

  const createController = (repository: ConstructorParameters<typeof UserRpcController>[0]) =>
    new UserRpcController(repository);

  it('is registered for RabbitMQ provider discovery', () => {
    expect(MESSAGE_COMPONENTS).toContain(UserRpcController);
  });

  it('returns basic profiles through the lightweight repository path', async () => {
    const repository = {
      getBasicProfilesByIds: jest.fn().mockResolvedValue([
        {
          userId: 'user-1',
          email: 'user@example.com',
          username: 'user',
          nickname: 'User One',
          avatarUrl: 'https://cdn.example.com/avatar.png',
        },
      ]),
    };
    const controller = createController(repository as never);

    await expect(
      controller.getUsersProfiles({
        payload: { userIds: ['user-1', 'user-1'] },
      } as never),
    ).resolves.toEqual([
      {
        id: 'user-1',
        email: 'user@example.com',
        nickname: 'User One',
        avatarUrl: 'https://cdn.example.com/avatar.png',
      },
    ]);

    expect(repository.getBasicProfilesByIds).toHaveBeenCalledWith(['user-1']);
  });

  it('returns immediately for empty profile requests', async () => {
    const repository = {
      getBasicProfilesByIds: jest.fn(),
    };
    const controller = createController(repository as never);

    await expect(
      controller.getUsersProfiles({
        payload: { userIds: [] },
      } as never),
    ).resolves.toEqual([]);
    expect(repository.getBasicProfilesByIds).not.toHaveBeenCalled();
  });

  it('nacks failed profile lookups without requeueing', async () => {
    jest.spyOn(AppLogger.prototype, 'error').mockImplementation();
    const repository = {
      getBasicProfilesByIds: jest.fn().mockRejectedValue(new Error('mongo timeout')),
    };
    const controller = createController(repository as never);

    await expect(
      controller.getUsersProfiles({
        payload: { userIds: ['user-1'] },
      } as never),
    ).resolves.toEqual(expect.any(Nack));
  });

  it('keeps the repository token available for app module wiring', () => {
    expect(USER_REPOSITORY).toBeDefined();
  });
});
