import { Types } from 'mongoose';
import {
  CollectionPhaseItemType,
  CollectionStatus,
  CollectionType,
} from '../../infrastructure/persistence/mongo/schemas/collection.schema';

/** Interface for a single item within a collection phase. */
export interface CollectionPhaseItemProps {
  itemId: string;
  itemType: CollectionPhaseItemType;
}

/** Interface for a collection phase (roadmap stage). */
export interface CollectionPhaseProps {
  phaseTitle: string;
  learningGoal: string;
  items: CollectionPhaseItemProps[];
}

/** Interface representing data constraints for  collection props. */
export interface CollectionProps {
  id: string;
  userId: string;
  title: string;
  slug: string;
  description: string;
  hightlights: string[];
  majorId: string;
  courseId: string;
  resourceIds: string[];
  type: CollectionType;
  discount: number;
  status: CollectionStatus;
  thumbnailUrl?: string;
  phases?: CollectionPhaseProps[];
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

/** Represents the  collection component. */
export class Collection {
  private props: CollectionProps;

  private constructor(props: CollectionProps) {
    this.props = props;
  }

  /**
   * Executes the create operation.
   *
   * @param params - The params parameter
   * @returns Result of type Collection
   */
  static create(params: {
    userId: string;
    title: string;
    slug: string;
    description: string;
    hightlights: string[];
    majorId: string;
    courseId: string;
    resourceIds?: string[];
    type: CollectionType;
    discount: number;
    thumbnailUrl?: string;
    phases?: CollectionPhaseProps[];
    status?: CollectionStatus;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }): Collection {
    const collectionId = new Types.ObjectId().toHexString();
    return new Collection({
      ...params,
      id: collectionId,
      resourceIds: params.resourceIds ?? [],
      status: params.status ?? CollectionStatus.AVAILABLE,
      phases: params.phases,
    });
  }

  /**
   * Executes the reconstitute operation.
   *
   * @param props - The props parameter
   * @returns Result of type Collection
   */
  static reconstitute(props: CollectionProps): Collection {
    return new Collection(props);
  }

  get id(): string {
    return this.props.id;
  }

  set id(value: string) {
    this.props.id = value;
  }

  get userId(): string {
    return this.props.userId;
  }

  set userId(value: string) {
    this.props.userId = value;
  }

  get title(): string {
    return this.props.title;
  }

  set title(value: string) {
    this.props.title = value;
  }

  get slug(): string {
    return this.props.slug;
  }

  set slug(value: string) {
    this.props.slug = value;
  }

  get description(): string {
    return this.props.description;
  }

  set description(value: string) {
    this.props.description = value;
  }

  get hightlights(): string[] {
    return this.props.hightlights;
  }

  set hightlights(value: string[]) {
    this.props.hightlights = value;
  }

  get majorId(): string {
    return this.props.majorId;
  }

  set majorId(value: string) {
    this.props.majorId = value;
  }

  get courseId(): string {
    return this.props.courseId;
  }

  set courseId(value: string) {
    this.props.courseId = value;
  }

  get resourceIds(): string[] {
    return this.props.resourceIds;
  }

  set resourceIds(value: string[]) {
    this.props.resourceIds = value;
  }

  get type(): CollectionType {
    return this.props.type;
  }

  set type(value: CollectionType) {
    this.props.type = value;
  }

  get discount(): number {
    return this.props.discount;
  }

  set discount(value: number) {
    this.props.discount = value;
  }

  get status(): CollectionStatus {
    return this.props.status;
  }

  set status(value: CollectionStatus) {
    this.props.status = value;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  set createdAt(value: Date | undefined) {
    this.props.createdAt = value;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  set updatedAt(value: Date | undefined) {
    this.props.updatedAt = value;
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  set deletedAt(value: Date | undefined) {
    this.props.deletedAt = value;
  }

  get thumbnailUrl(): string | undefined {
    return this.props.thumbnailUrl;
  }

  set thumbnailUrl(value: string | undefined) {
    this.props.thumbnailUrl = value;
  }

  get phases(): CollectionPhaseProps[] | undefined {
    return this.props.phases;
  }

  set phases(value: CollectionPhaseProps[] | undefined) {
    this.props.phases = value;
  }
}
