import {
  CollectionPhaseItemType,
  CollectionType,
} from '../../infrastructure/persistence/mongo/schemas/collection.schema';

export interface CommandPhaseItem {
  itemId: string;
  itemType: CollectionPhaseItemType;
}

export interface CommandPhase {
  phaseTitle: string;
  learningGoal: string;
  items: CommandPhaseItem[];
}

/** CQRS Command designed to enforce  create collection. */
export class CreateCollectionCommand {
  constructor(
    public readonly userId: string,
    public readonly title: string,
    public readonly description: string,
    public readonly hightlights: string[],
    public readonly majorId: string,
    public readonly courseId: string,
    public readonly resourceIds: string[],
    public readonly type: CollectionType,
    public readonly discount: number,
    public readonly thumbnailBase64?: string,
    public readonly tutorialIds?: string[],
    public readonly correlationId?: string,
    public readonly phases?: CommandPhase[],
  ) {}
}
