import { UpdateTutorialHandler } from '../../src/application/commands/handlers/update-tutorial.handler';
import { UpdateTutorialCommand } from '../../src/application/commands/update-tutorial.command';
import { TutorialStatus } from '../../src/infrastructure/persistence/mongo/schemas/tutorial.schema';

describe('UpdateTutorialHandler', () => {
  const command = new UpdateTutorialCommand(
    'tutorial-1',
    'user-1',
    'New title',
    'New description',
    ['h1'],
    'major-1',
    'course-1',
    10000,
    15,
    undefined,
    [],
    'corr-1',
  );

  it('blocks edits for available tutorials', async () => {
    const tutorialRepository = {
      findByIdWithDetails: jest.fn().mockResolvedValue({
        id: 'tutorial-1',
        userId: 'user-1',
        status: TutorialStatus.AVAILABLE,
      }),
      updateDetails: jest.fn(),
    };
    const handler = new UpdateTutorialHandler(tutorialRepository as never);

    await expect(handler.execute(command)).rejects.toThrow('Available tutorials cannot be edited');
    expect(tutorialRepository.updateDetails).not.toHaveBeenCalled();
  });
});
