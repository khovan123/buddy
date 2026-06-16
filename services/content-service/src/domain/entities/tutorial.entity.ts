import { Types } from 'mongoose';
import type { LearningFit } from './learning-fit';
import { TutorialStatus } from '../../infrastructure/persistence/mongo/schemas/tutorial.schema';

/** Interface representing data constraints for  tutorial media. */
export interface TutorialMedia {
  fileId: string;
  videoUrl?: string | null;
  streamingUrl?: string | null;
  trailerUrl?: string | null;
  duration: number;
  fileSize?: number;
  extension: string;
}

export interface TutorialStepResourceDetails {
  id: string;
  slug: string;
  title: string;
  summary: string;
}

export interface TutorialStepResource {
  resourceId: string;
  instructionNote: string;
  resource?: TutorialStepResourceDetails | null;
}

export interface TutorialStep {
  title: string;
  resources: TutorialStepResource[];
}

/** Interface representing data constraints for  tutorial props. */
export interface TutorialProps {
  id: string;
  userId: string;
  title: string;
  slug: string;
  description: string;
  hightlights: string[];
  majorId: string;
  courseId: string;
  media: TutorialMedia;
  price: number;
  isVerified: boolean;
  status: TutorialStatus;
  discountBundle: number;
  collectionId?: string;
  resourceIds?: string[];
  collectionIds?: string[];
  steps?: TutorialStep[];
  learningFit?: LearningFit | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

/** Represents the  tutorial component. */
export class Tutorial {
  private props: TutorialProps;

  private constructor(props: TutorialProps) {
    this.props = props;
  }

  /**
   * Executes the create operation.
   *
   * @param params - The params parameter
   * @returns Result of type Tutorial
   */
  static create(params: {
    userId: string;
    title: string;
    slug: string;
    description: string;
    hightlights: string[];
    majorId: string;
    courseId: string;
    media: TutorialMedia;
    price: number;
    isVerified?: boolean;
    status?: TutorialStatus;
    discountBundle?: number;
    collectionId?: string;
    resourceIds?: string[];
    collectionIds?: string[];
    steps?: TutorialStep[];
    learningFit?: LearningFit;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }): Tutorial {
    const tutorialId = new Types.ObjectId().toHexString();
    return new Tutorial({
      ...params,
      id: tutorialId,
      isVerified: params.isVerified ?? false,
      status: params.status ?? TutorialStatus.AVAILABLE,
      discountBundle: params.discountBundle ?? 15,
      collectionIds: params.collectionIds ?? [],
      steps: params.steps ?? [],
    });
  }

  /**
   * Executes the reconstitute operation.
   *
   * @param props - The props parameter
   * @returns Result of type Tutorial
   */
  static reconstitute(props: TutorialProps): Tutorial {
    return new Tutorial(props);
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

  get media(): TutorialMedia {
    return this.props.media;
  }

  set media(value: TutorialMedia) {
    this.props.media = value;
  }

  get price(): number {
    return this.props.price;
  }

  set price(value: number) {
    this.props.price = value;
  }

  get isVerified(): boolean {
    return this.props.isVerified;
  }

  set isVerified(value: boolean) {
    this.props.isVerified = value;
  }

  get status(): TutorialStatus {
    return this.props.status;
  }

  set status(value: TutorialStatus) {
    this.props.status = value;
  }

  get discountBundle(): number {
    return this.props.discountBundle;
  }

  set discountBundle(value: number) {
    this.props.discountBundle = value;
  }

  get collectionId(): string | undefined {
    return this.props.collectionId;
  }

  set collectionId(value: string | undefined) {
    this.props.collectionId = value;
  }

  get resourceIds(): string[] | undefined {
    return this.props.resourceIds;
  }

  set resourceIds(value: string[] | undefined) {
    this.props.resourceIds = value;
  }

  get collectionIds(): string[] | undefined {
    return this.props.collectionIds;
  }

  set collectionIds(value: string[] | undefined) {
    this.props.collectionIds = value;
  }

  get steps(): TutorialStep[] | undefined {
    return this.props.steps;
  }

  set steps(value: TutorialStep[] | undefined) {
    this.props.steps = value;
  }

  get learningFit(): LearningFit | null | undefined {
    return this.props.learningFit;
  }

  set learningFit(value: LearningFit | null | undefined) {
    this.props.learningFit = value;
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
}
