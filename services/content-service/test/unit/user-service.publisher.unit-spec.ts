/// <reference types="jest" />

import 'reflect-metadata';

import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { AppLogger, EXCHANGES } from '@libs/common';
import type { Cache } from 'cache-manager';

import { UserServicePublisher } from '../../src/infrastructure/messaging/publishers/user-service.rpc';

describe('UserServicePublisher', () => {
  beforeAll(() => {
    process.env.LOG_LEVEL ??= 'debug';
    process.env.SERVICE_NAME ??= 'content-service';
    process.env.NODE_ENV ??= 'test';
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('degrades uploader enrichment as a warning when user profile RPC times out', async () => {
    const errorSpy = jest.spyOn(AppLogger.prototype, 'error').mockImplementation();
    const warnSpy = jest.spyOn(AppLogger.prototype, 'warn').mockImplementation();
    const amqpConnection = {
      request: jest.fn(async () => {
        throw new Error(
          'Failed to receive response within timeout of 10000ms for exchange "user.events" and routing key "user.rpc.get_profiles"',
        );
      }),
    } as unknown as AmqpConnection;
    const cache = {
      mget: jest.fn(async () => [null]),
      set: jest.fn(),
    } as unknown as Cache;
    const publisher = new UserServicePublisher(amqpConnection, cache);

    const profiles = await publisher.getUsersProfiles(['user-1']);

    expect(profiles).toEqual([]);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('User profile RPC unavailable'),
      expect.objectContaining({
        exchange: EXCHANGES.USER,
        routingKey: 'user.rpc.get_profiles',
        userCount: 1,
      }),
    );
  });
});
