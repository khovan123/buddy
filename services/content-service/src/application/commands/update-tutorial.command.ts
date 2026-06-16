import type { LearningFit } from '../../domain/entities/learning-fit';

export class UpdateTutorialCommand {
  constructor(
    public readonly tutorialId: string,
    public readonly requesterId: string,
    public readonly title: string,
    public readonly description: string,
    public readonly hightlights: string[],
    public readonly majorId: string,
    public readonly courseId: string,
    public readonly price: number,
    public readonly discountBundle: number,
    public readonly collectionId?: string,
    public readonly steps?: Array<{
      title: string;
      resources: Array<{ resourceId: string; instructionNote: string }>;
    }>,
    public readonly correlationId?: string,
    public readonly learningFit?: LearningFit,
  ) {}
}
