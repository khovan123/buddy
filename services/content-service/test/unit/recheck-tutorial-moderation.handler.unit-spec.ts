import 'reflect-metadata';

import { RecheckTutorialModerationHandler } from '../../src/application/commands/handlers/recheck-tutorial-moderation.handler';
import { RecheckTutorialModerationCommand } from '../../src/application/commands/recheck-tutorial-moderation.command';
import { TutorialStatus } from '../../src/infrastructure/persistence/mongo/schemas/tutorial.schema';

describe('RecheckTutorialModerationHandler', () => {
  it('blocks recheck for available tutorials', async () => {
    const tutorialRepository = {
      findByIdWithDetails: jest.fn().mockResolvedValue({
        id: 'tutorial-1',
        userId: 'user-1',
        status: TutorialStatus.AVAILABLE,
      }),
      applyModerationResult: jest.fn(),
    };
    const recommendationSync = {
      send: jest.fn(),
    };
    const moderationNotification = {
      send: jest.fn(),
    };
    const handler = new RecheckTutorialModerationHandler(
      tutorialRepository as never,
      recommendationSync as never,
      moderationNotification as never,
    );

    await expect(
      handler.execute(new RecheckTutorialModerationCommand('tutorial-1', 'user-1', 'c-1')),
    ).rejects.toThrow('Available tutorials cannot be rechecked');
    expect(tutorialRepository.applyModerationResult).not.toHaveBeenCalled();
  });
});
