import { jest } from '@jest/globals';

jest.mock('uuid', () => ({
  v4: () => 'mock-correlation-id',
}));

jest.mock('mongoose', () => {
  const actual = jest.requireActual<Record<string, unknown>>('mongoose');

  const fakeConnection: Record<string, unknown> = {};
  Object.assign(fakeConnection, {
    asPromise: async () => fakeConnection,
    model: jest.fn(() => ({})),
    close: jest.fn(async () => undefined),
    on: jest.fn(() => fakeConnection),
    once: jest.fn(() => fakeConnection),
    removeListener: jest.fn(() => fakeConnection),
    set: jest.fn(() => fakeConnection),
    plugin: jest.fn(() => fakeConnection),
  });

  return {
    ...actual,
    createConnection: jest.fn(() => fakeConnection),
  };
});
