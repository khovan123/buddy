import { Types } from 'mongoose';

import { ResourceStatus } from '../../infrastructure/persistence/mongo/schemas/resource.schema';
import type { LearningFit } from './learning-fit';
import { ResourceCreatedDomainEvent } from '../events/resource-created.domain-event';

export type ResourceMeta = {
  fileId: string;
  s3Key?: string;
  downloadUrl: string;
  fileSize: number;
  extension: string;
};

export type ResourceMetaInput = ResourceMeta;

/** Interface representing data constraints for  resource props. */
export interface ResourceProps {
  id: string;
  userId: string;
  price: number;
  title: string;
  slug: string;
  summary: string;
  hightlights: string[];
  majorId: string;
  courseId: string;
  status: ResourceStatus;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  meta: ResourceMeta[];
  thumbnailUrl?: string;
  primaryS3Key?: string;
  tutorialId?: string;
  collectionId?: string;
  learningFit?: LearningFit | null;
}

/** Represents the  resource component. */
export class Resource {
  private props: ResourceProps;
  private readonly _domainEvents: ResourceCreatedDomainEvent[] = [];

  private constructor(props: ResourceProps) {
    this.props = props;
  }

  // ── Factory ───────────────────────────────────────────────────────
  /**
   * Executes the create operation.
   *
   * @param params - The params parameter
   * @returns Result of type Resource
   */
  static create(params: {
    userId: string;
    title: string;
    slug: string;
    summary: string;
    hightlights: string[];
    majorId: string;
    courseId: string;
    price: number;
    meta: ResourceMetaInput[];
    thumbnailUrl?: string;
    collectionId?: string;
    learningFit?: LearningFit;
  }): Resource {
    const now = new Date();
    const { meta, ...rest } = params;
    const resourceId = new Types.ObjectId().toHexString();
    const resource = new Resource({
      id: resourceId,
      ...rest,
      status: ResourceStatus.PENDING,
      isVerified: false,
      createdAt: now,
      updatedAt: now,
      meta,
    });

    resource._domainEvents.push(
      new ResourceCreatedDomainEvent({
        userId: rest.userId,
        price: rest.price,
        title: rest.title,
        summary: rest.summary,
        status: ResourceStatus.AVAILABLE,
        resourceMeta: resource.meta,
        collectionId: resource.collectionId,
      }),
    );

    return resource;
  }

  /**
   * Executes the reconstitute operation.
   *
   * @param props - The props parameter
   * @returns Result of type Resource
   */
  static reconstitute(props: ResourceProps): Resource {
    return new Resource(props);
  }

  // ── Domain events ─────────────────────────────────────────────────
  /**
   * Executes the pull domain events operation.
   *
   * @returns Result of type ResourceCreatedDomainEvent[]
   */
  pullDomainEvents(): ResourceCreatedDomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents.length = 0;
    return events;
  }

  // ── Getters & Setters ────────────────────────────────────────────
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

  get slug(): string {
    return this.props.slug;
  }
  set slug(value: string) {
    this.props.slug = value;
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

  get collectionId(): string | undefined {
    return this.props.collectionId;
  }
  set collectionId(value: string) {
    this.props.collectionId = value;
  }
  get tutorialId(): string | undefined {
    return this.props.tutorialId;
  }
  set tutorialId(value: string) {
    this.props.tutorialId = value;
  }

  get price(): number {
    return this.props.price;
  }
  set price(value: number) {
    this.props.price = value;
  }

  get title(): string {
    return this.props.title;
  }
  set title(value: string) {
    this.props.title = value;
  }

  get summary(): string {
    return this.props.summary;
  }
  set summary(value: string) {
    this.props.summary = value;
  }

  get hightlights(): string[] {
    return this.props.hightlights;
  }
  set hightlights(value: string[]) {
    this.props.hightlights = value;
  }

  get status(): ResourceStatus {
    return this.props.status;
  }
  set status(value: ResourceStatus) {
    this.props.status = value;
  }

  get isVerified(): boolean {
    return this.props.isVerified;
  }
  set isVerified(value: boolean) {
    this.props.isVerified = value;
  }

  get resourceVerified(): boolean {
    return this.props.isVerified;
  }
  set resourceVerified(value: boolean) {
    this.props.isVerified = value;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
  set createdAt(value: Date) {
    this.props.createdAt = value;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
  set updatedAt(value: Date) {
    this.props.updatedAt = value;
  }

  get meta(): ResourceMeta[] {
    return this.props.meta;
  }
  set meta(value: ResourceMeta[]) {
    this.props.meta = value;
  }

  get resourceMeta(): ResourceMeta[] {
    return this.props.meta;
  }
  set resourceMeta(value: ResourceMeta[]) {
    this.props.meta = value;
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  set deletedAt(value: Date) {
    this.props.deletedAt = value;
  }

  get thumbnailUrl(): string | undefined {
    return this.props.thumbnailUrl;
  }

  set thumbnailUrl(value: string | undefined) {
    this.props.thumbnailUrl = value;
  }

  /** Cached S3 key from upload-service meta[0] for direct preview URL lookup */
  get primaryS3Key(): string | undefined {
    return this.props.primaryS3Key;
  }

  set primaryS3Key(value: string | undefined) {
    this.props.primaryS3Key = value;
  }

  get learningFit(): LearningFit | null | undefined {
    return this.props.learningFit;
  }

  set learningFit(value: LearningFit | null | undefined) {
    this.props.learningFit = value;
  }
}
