import { TutorialStatus } from '../../infrastructure/persistence/mongo/schemas/tutorial.schema';
import { TutorialMedia } from '../entities/tutorial.entity';

/** Represents the  tutorial created domain event component. */
export class TutorialCreatedDomainEvent {
  constructor(
    public readonly payload: {
      userId: string;
      title: string;
      description: string;
      price: number;
      media: TutorialMedia;
      status: TutorialStatus;
      discountBundle: number;
      collectionId?: string;
    },
  ) {}
}
