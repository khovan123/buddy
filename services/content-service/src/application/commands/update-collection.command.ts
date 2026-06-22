import {
  CollectionPhaseItemType,
  CollectionType,
} from '../../infrastructure/persistence/mongo/schemas/collection.schema';

export interface UpdateCollectionPhase {
  phaseTitle: string;
  learningGoal: string;
  items: Array<{ itemId: string; itemType: CollectionPhaseItemType }>;
}

export class UpdateCollectionCommand {
  constructor(
    public readonly collectionId: string,
    public readonly requesterId: string,
    public readonly title: string,
    public readonly description: string,
    public readonly hightlights: string[],
    public readonly majorId: string,
    public readonly courseId: string,
    public readonly type: CollectionType,
    public readonly discount: number,
    public readonly phases?: UpdateCollectionPhase[],
    public readonly thumbnailBase64?: string,
    public readonly correlationId?: string,
  ) {}
}
