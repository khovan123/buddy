/// <reference types="jest" />

import 'reflect-metadata';

import { UpdateResourceHandler } from '../../src/application/commands/handlers/update-resource.handler';
import { UpdateResourceCommand } from '../../src/application/commands/update-resource.command';
import { ResourceStatus } from '../../src/infrastructure/persistence/mongo/schemas/resource.schema';

describe('UpdateResourceHandler', () => {
  const baseResource = {
    id: 'resource-1',
    userId: 'user-1',
    status: ResourceStatus.PROCESSING,
  };

  const command = new UpdateResourceCommand(
    'resource-1',
    'user-1',
    'New title',
    'New summary',
    ['h1'],
    'major-1',
    'course-1',
    10000,
    undefined,
    undefined,
    'corr-1',
  );

  it('blocks edits for available resources', async () => {
    const resourceRepository = {
      findByIdWithDetails: jest
        .fn()
        .mockResolvedValue({ ...baseResource, status: ResourceStatus.AVAILABLE }),
      updateDetails: jest.fn(),
    };
    const storageBrokerPublisher = {
      emitThumbnailUpload: jest.fn(),
    };
    const handler = new UpdateResourceHandler(
      resourceRepository as never,
      storageBrokerPublisher as never,
    );

    await expect(handler.execute(command)).rejects.toThrow(
      'Available resources cannot be edited',
    );
    expect(resourceRepository.updateDetails).not.toHaveBeenCalled();
  });
});
