import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, InferSchemaType, Model, Types } from 'mongoose';

import { Tutorial, TutorialMedia } from '../../../../domain/entities/tutorial.entity';
import {
  ContentModerationPersistenceResult,
  ITutorialRepository,
  TutorialCollectionDetails,
  TutorialListQueryParams,
  TutorialQueryItem,
  TutorialQueryResult,
  TutorialResourceDetails,
} from '../../../../domain/repositories/tutorial.repository.interface';
import { CourseSchema } from '../schemas/course.schema';
import { MajorSchema } from '../schemas/major.schema';
import {
  ContentModerationStatus,
  TutorialDocument,
  TutorialSchema,
  Tutorial as TutorialSchemaClass,
  TutorialStatus,
} from '../schemas/tutorial.schema';

export type MajorLean = InferSchemaType<typeof MajorSchema> & { _id: Types.ObjectId };
export type CourseLean = InferSchemaType<typeof CourseSchema> & { _id: Types.ObjectId };

export type TutorialSchemaShape = InferSchemaType<typeof TutorialSchema>;
type TutorialMediaSchemaShape = TutorialSchemaShape['media'];

/**
 * Persistence type: DB writes without populate
 * Used for toDomain() - receives raw ObjectId/string values only
 */
type TutorialPersistenceLean = TutorialSchemaShape & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  majorId?: Types.ObjectId | string;
  courseId?: Types.ObjectId | string;
  collectionId?: Types.ObjectId | string | null;
  resourceIds?: Array<Types.ObjectId | string> | null;
  collectionIds?: Array<Types.ObjectId | string> | null;
  steps?: Array<{
    title: string;
    resources: Array<{ resourceId: Types.ObjectId | string; instructionNote: string }>;
  }> | null;
};

/**
 * Query type for read queries WITH populated Collection and Resources
 * Used when calling .populate('collectionId').populate('resourceIds')
 */
type TutorialQueryWithPopulate = Omit<
  TutorialSchemaShape,
  'collectionId' | 'resourceIds' | 'steps'
> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  majorId?: Types.ObjectId | string;
  courseId?: Types.ObjectId | string;
  collectionId?: Types.ObjectId | string | null;
  collection?: {
    _id: Types.ObjectId | string;
    userId: string;
    title: string;
    description: string;
    hightlights: string[];
    type: string;
    discount: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
  } | null;
  resourceIds?: Array<Types.ObjectId | string> | null;
  resources?: Array<{
    _id: Types.ObjectId | string;
    userId: string;
    title: string;
    summary: string;
    price: number;
    status: string;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
  }> | null;
  collectionIds?: Array<Types.ObjectId | string> | null;
  steps?: Array<{
    title: string;
    resources: Array<{
      resourceId: Types.ObjectId | string;
      instructionNote: string;
      resource?: {
        _id: Types.ObjectId | string;
        slug: string;
        title: string;
        summary: string;
      } | null;
    }>;
  }> | null;
  major?: MajorLean | null;
  course?: CourseLean | null;
};

type TutorialWritePayload = {
  _id: Types.ObjectId;
  userId: string;
  title: string;
  slug: string;
  description: string;
  hightlights: string[];
  majorId: string;
  courseId: string;
  media: TutorialMediaSchemaShape;
  price: number;
  isVerified: boolean;
  status: TutorialStatus;
  discountBundle: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  collectionId?: string;
  resourceIds?: string[];
  collectionIds?: string[];
  steps?: Array<{
    title: string;
    resources: Array<{ resourceId: string; instructionNote: string }>;
  }>;
};

type TutorialSearchClause =
  | { title: { $regex: string; $options: string } }
  | { description: { $regex: string; $options: string } };

/** Repository interface/implementation for  tutorial mongo data access. */
@Injectable()
export class TutorialMongoRepository implements ITutorialRepository {
  constructor(
    @InjectModel(TutorialSchemaClass.name)
    private readonly tutorialModel: Model<TutorialDocument>,
  ) {}

  /**
   * Executes the find by collection id operation.
   *
   * @param collectionId - The collectionId parameter
   * @returns Result of type Promise<Tutorial | null>
   */
  async findByCollectionId(collectionId: string): Promise<Tutorial | null> {
    const row = await this.tutorialModel
      .findOne({ collectionId })
      .populate('major')
      .populate('course')
      .lean<TutorialPersistenceLean>()
      .exec();
    return row ? this.toDomain(row) : null;
  }

  /**
   * Executes the find by resource ids operation.
   *
   * @param resourceIds - The resourceIds parameter
   * @returns Result of type Promise<Tutorial[] | null>
   */
  async findByResourceIds(resourceIds: string[]): Promise<Tutorial[] | null> {
    const results = await this.tutorialModel
      .find({ resourceIds: { $in: resourceIds } })
      .populate('major')
      .populate('course')
      .lean<TutorialPersistenceLean[]>()
      .exec();
    return results ? results.map((row) => this.toDomain(row)) : null;
  }

  /**
   * Executes the save operation.
   *
   * @param tutorial - The tutorial parameter
   */
  async save(tutorial: Tutorial): Promise<void> {
    await this.tutorialModel.create(this.toPersistence(tutorial));
  }

  /**
   * Executes the save media operation.
   *
   * @param tutorialId - The tutorialId parameter
   * @param media - The media parameter
   */
  async saveMedia(tutorialId: string, media: TutorialMedia): Promise<void> {
    await this.tutorialModel.updateOne({ _id: tutorialId }, { $set: { media } }).exec();
  }

  /**
   * Executes the delete all by user id operation.
   *
   * @param userId - The userId parameter
   */
  async deleteAllByUserId(userId: string): Promise<void> {
    await this.tutorialModel.deleteMany({ userId }).exec();
  }

  /**
   * Executes the find by id operation.
   *
   * @param id - The id parameter
   * @returns Result of type Promise<Tutorial | null>
   */
  async findById(id: string): Promise<Tutorial | null> {
    const row = await this.tutorialModel
      .findById(id)
      .populate('major')
      .populate('course')
      .lean<TutorialPersistenceLean>()
      .exec();
    return row ? this.toDomain(row) : null;
  }

  /**
   * Executes the find by ids operation.
   *
   * @param ids - The ids parameter
   * @returns Result of type Promise<Tutorial[]>
   */
  async findByIds(ids: string[]): Promise<Tutorial[]> {
    const rows = await this.tutorialModel
      .find({ _id: { $in: ids } })
      .populate('major')
      .populate('course')
      .lean<TutorialPersistenceLean[]>()
      .exec();
    return rows.map((row) => this.toDomain(row));
  }

  /**
   * Executes the find by slug operation.
   *
   * @param slug - The slug parameter
   * @returns Result of type Promise<Tutorial | null>
   */
  async findBySlug(slug: string): Promise<Tutorial | null> {
    const row = await this.tutorialModel
      .findOne({ slug })
      .populate('major')
      .populate('course')
      .lean<TutorialPersistenceLean>()
      .exec();
    return row ? this.toDomain(row) : null;
  }

  /**
   * Executes the find media by id operation.
   *
   * @param fileId - The fileId parameter
   * @returns Result of type Promise<TutorialMedia | null>
   */
  async findMediaById(fileId: string): Promise<TutorialMedia | null> {
    const row = await this.tutorialModel
      .findOne({ 'media.fileId': fileId }, { _id: 1, media: 1 })
      .lean<{ media?: TutorialMediaSchemaShape }>()
      .exec();

    return row?.media ? this.toDomainMedia(row.media) : null;
  }

  /**
   * Executes the find media by tutorial id operation.
   *
   * @param tutorialId - The tutorialId parameter
   * @returns Result of type Promise<TutorialMedia | null>
   */
  async findMediaByTutorialId(tutorialId: string): Promise<TutorialMedia | null> {
    const row = await this.tutorialModel
      .findById(tutorialId, { _id: 1, media: 1 })
      .lean<{ media?: TutorialMediaSchemaShape }>()
      .exec();

    return row?.media ? this.toDomainMedia(row.media) : null;
  }

  /**
   * Executes the find by id with details operation.
   *
   * @param id - The id parameter
   * @returns Result of type Promise<TutorialQueryItem | null>
   */
  async findByIdWithDetails(id: string): Promise<TutorialQueryItem | null> {
    const row = await this.tutorialModel
      .findById(id)
      .populate<Pick<TutorialQueryWithPopulate, 'collectionId'>>('collectionId')
      .populate<Pick<TutorialQueryWithPopulate, 'resourceIds'>>('resourceIds')
      .populate('steps.resources.resource')
      .populate('major')
      .populate('course')
      .lean<TutorialQueryWithPopulate>()
      .exec();

    return row ? this.toQueryItem(row) : null;
  }

  /**
   * Executes the find by ids with details operation.
   *
   * @param ids - The ids parameter
   * @returns Result of type Promise<TutorialQueryItem[]>
   */
  async findByIdsWithDetails(ids: string[]): Promise<TutorialQueryItem[]> {
    if (!ids || ids.length === 0) return [];
    const rows = await this.tutorialModel
      .find({ _id: { $in: ids } })
      .populate<Pick<TutorialQueryWithPopulate, 'collectionId'>>('collectionId')
      .populate<Pick<TutorialQueryWithPopulate, 'resourceIds'>>('resourceIds')
      .populate('steps.resources.resource')
      .populate('major')
      .populate('course')
      .lean<TutorialQueryWithPopulate[]>()
      .exec();

    return rows.map((row) => this.toQueryItem(row));
  }

  /**
   * Executes the find by slug with details operation.
   *
   * @param slug - The slug parameter
   * @returns Result of type Promise<TutorialQueryItem | null>
   */
  async findBySlugWithDetails(slug: string): Promise<TutorialQueryItem | null> {
    const row = await this.tutorialModel
      .findOne({ slug })
      .populate<Pick<TutorialQueryWithPopulate, 'collectionId'>>('collectionId')
      .populate<Pick<TutorialQueryWithPopulate, 'resourceIds'>>('resourceIds')
      .populate('steps.resources.resource')
      .populate('major')
      .populate('course')
      .lean<TutorialQueryWithPopulate>()
      .exec();

    return row ? this.toQueryItem(row) : null;
  }

  async findByMediaFileIdWithDetails(fileId: string): Promise<TutorialQueryItem | null> {
    const row = await this.tutorialModel
      .findOne({ 'media.fileId': fileId })
      .populate<Pick<TutorialQueryWithPopulate, 'collectionId'>>('collectionId')
      .populate<Pick<TutorialQueryWithPopulate, 'resourceIds'>>('resourceIds')
      .populate('major')
      .populate('course')
      .lean<TutorialQueryWithPopulate>()
      .exec();

    return row ? this.toQueryItem(row) : null;
  }

  /**
   * Executes the find available tutorials operation.
   *
   * @param params - The params parameter
   * @returns Result of type Promise<TutorialQueryResult>
   */
  async findAvailableTutorials(params: TutorialListQueryParams): Promise<TutorialQueryResult> {
    return this.findPagedTutorials({
      ...params,
    });
  }

  /**
   * Executes the find my tutorials operation (no status filter).
   *
   * @param params - The params parameter
   * @returns Result of type Promise<TutorialQueryResult>
   */
  async findMyTutorials(params: TutorialListQueryParams): Promise<TutorialQueryResult> {
    return this.findPagedMyTutorials(params);
  }

  /**
   * Executes the find available tutorial collections operation.
   *
   * @param params - The params parameter
   * @returns Result of type Promise<TutorialQueryResult>
   */
  async findAvailableTutorialCollections(
    params: TutorialListQueryParams,
  ): Promise<TutorialQueryResult> {
    return this.findPagedTutorials({
      ...params,
      collectionId: { $ne: null },
    });
  }

  /**
   * Executes the update operation.
   *
   * @param tutorial - The tutorial parameter
   */
  async update(tutorial: Tutorial): Promise<void> {
    const persistence = this.toPersistence(tutorial);
    const data: Partial<TutorialWritePayload> = { ...persistence };
    delete data._id;
    await this.tutorialModel.updateOne({ _id: tutorial.id }, data).exec();
  }

  /**
   * Executes the update media operation.
   *
   * @param tutorialId - The tutorialId parameter
   * @param media - The media parameter
   */
  async updateMedia(tutorialId: string, media: TutorialMedia): Promise<void> {
    await this.tutorialModel.updateOne({ _id: tutorialId }, { $set: { media } }).exec();
  }

  /**
   * Executes the mark available with processed media operation.
   *
   * @param tutorialId - The tutorialId parameter
   * @param params - The params parameter
   */
  async markAvailableWithProcessedMedia(
    tutorialId: string,
    params: { streamingUrl: string; trailerUrl: string },
  ): Promise<void> {
    await this.tutorialModel
      .updateOne(
        { _id: tutorialId },
        {
          $set: {
            status: TutorialStatus.AVAILABLE,
            'media.streamingUrl': params.streamingUrl,
            'media.trailerUrl': params.trailerUrl,
          },
        },
      )
      .exec();
  }

  /**
   * Executes the delete operation.
   *
   * @param id - The id parameter
   */
  async delete(id: string): Promise<void> {
    await this.tutorialModel.deleteOne({ _id: id }).exec();
  }

  /**
   * Executes the delete pending older than operation.
   *
   * @param cutoff - The cutoff parameter
   * @returns Result of type Promise<number>
   */
  async deletePendingOlderThan(cutoff: Date): Promise<number> {
    const result = await this.tutorialModel
      .deleteMany({
        status: TutorialStatus.PENDING,
        createdAt: { $lt: cutoff },
      })
      .exec();

    return result.deletedCount ?? 0;
  }

  /**
   * Batch-assign a collectionId to multiple tutorials.
   *
   * @param tutorialIds - The tutorial IDs to update
   * @param collectionId - The collection ID to assign
   */
  async assignCollectionToTutorials(tutorialIds: string[], collectionId: string): Promise<void> {
    await this.tutorialModel
      .updateMany({ _id: { $in: tutorialIds }, deletedAt: null }, { $set: { collectionId } })
      .exec();
  }

  /**
   * Find tutorials for a given course that are NOT assigned to any collection.
   *
   * @param courseId - The courseId to filter by
   * @param limit - Max number of results
   * @returns Result of type Promise<TutorialQueryItem[]>
   */
  async findUncollectedTutorials(courseId: string, limit: number): Promise<TutorialQueryItem[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const rows = await this.tutorialModel
      .find({
        status: TutorialStatus.AVAILABLE,
        deletedAt: null,
        courseId,
        $or: [{ collectionId: null }, { collectionId: { $exists: false } }],
      })
      .populate<Pick<TutorialQueryWithPopulate, 'collectionId'>>('collectionId')
      .populate<Pick<TutorialQueryWithPopulate, 'resourceIds'>>('resourceIds')
      .populate('major')
      .populate('course')
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean<TutorialQueryWithPopulate[]>()
      .exec();

    return rows.map((row) => this.toQueryItem(row));
  }

  /**
   * Executes the find top tutorials operation.
   *
   * @param limit - The limit parameter
   * @returns Result of type Promise<TutorialQueryItem[]>
   */
  async findTopTutorials(
    limit: number,
    search?: string,
    semester?: number,
    majorId?: string,
  ): Promise<TutorialQueryItem[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 20);
    const filter: Record<string, unknown> = {
      status: TutorialStatus.AVAILABLE,
      deletedAt: null,
      // collectionId: null,
    };

    if (majorId) {
      filter.majorId = new Types.ObjectId(majorId);
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    if (semester) {
      const CourseModel = this.tutorialModel.db.model('Course');
      const matchingCourseIds = await CourseModel.find({ semester, deletedAt: null }, { _id: 1 })
        .lean<{ _id: Types.ObjectId }[]>()
        .exec();
      filter.courseId = { $in: matchingCourseIds.map((c) => c._id) };
    }

    const rows = await this.tutorialModel
      .find(filter)
      .populate<Pick<TutorialQueryWithPopulate, 'collectionId'>>('collectionId')
      .populate<Pick<TutorialQueryWithPopulate, 'resourceIds'>>('resourceIds')
      .populate('major')
      .populate('course')
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean<TutorialQueryWithPopulate[]>()
      .exec();

    return rows.map((row) => this.toQueryItem(row));
  }

  /**
   * Executes the find paged tutorials operation.
   *
   * @param params - The params parameter
   * @returns Result of type Promise<TutorialQueryResult>
   */
  private async findPagedTutorials(
    params: TutorialListQueryParams & {
      collectionId?: null | { $ne: null };
    },
  ): Promise<TutorialQueryResult> {
    const { page, limit, search, userId, collectionId, semester, majorId } = params;
    const safeLimit = Math.max(limit, 1);
    const skip = (page - 1) * safeLimit;

    const filter: Record<string, unknown> = {
      status: TutorialStatus.AVAILABLE,
      deletedAt: null,
    };

    if (userId) {
      filter.userId = userId;
    }

    if (majorId) {
      filter.majorId = new Types.ObjectId(majorId);
    }

    if (collectionId) {
      filter.collectionId = collectionId;
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    // If semester is specified, find courseIds that match the semester first
    if (semester) {
      const CourseModel = this.tutorialModel.db.model('Course');
      const matchingCourseIds = await CourseModel.find({ semester, deletedAt: null }, { _id: 1 })
        .lean<{ _id: Types.ObjectId }[]>()
        .exec();
      filter.courseId = { $in: matchingCourseIds.map((c) => c._id) };
    }

    const [rows, total] = await Promise.all([
      this.tutorialModel
        .find(filter)
        .populate<Pick<TutorialQueryWithPopulate, 'collectionId'>>('collectionId')
        .populate<Pick<TutorialQueryWithPopulate, 'resourceIds'>>('resourceIds')
        .populate('major')
        .populate('course')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean<TutorialQueryWithPopulate[]>()
        .exec(),
      this.tutorialModel.countDocuments(filter).exec(),
    ]);

    return {
      data: rows.map((row) => this.toQueryItem(row)),
      meta: {
        total,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Executes the find paged my tutorials operation (no status filter).
   *
   * @param params - The params parameter
   * @returns Result of type Promise<TutorialQueryResult>
   */
  private async findPagedMyTutorials(
    params: TutorialListQueryParams,
  ): Promise<TutorialQueryResult> {
    const { page, limit, search, userId } = params;
    const safeLimit = Math.max(limit, 1);
    const skip = (page - 1) * safeLimit;

    const filter: {
      deletedAt: null;
      userId?: string;
      $or?: TutorialSearchClause[];
    } = {
      deletedAt: null,
    };

    if (userId) {
      filter.userId = userId;
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.tutorialModel
        .find(filter)
        .populate<Pick<TutorialQueryWithPopulate, 'collectionId'>>('collectionId')
        .populate<Pick<TutorialQueryWithPopulate, 'resourceIds'>>('resourceIds')
        .populate('major')
        .populate('course')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean<TutorialQueryWithPopulate[]>()
        .exec(),
      this.tutorialModel.countDocuments(filter).exec(),
    ]);

    return {
      data: rows.map((row) => this.toQueryItem(row)),
      meta: {
        total,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Executes the to domain operation.
   *
   * @param row - The row parameter
   * @returns Result of type Tutorial
   */
  private toDomain(row: TutorialPersistenceLean): Tutorial {
    return Tutorial.reconstitute({
      id: row._id.toString(),
      userId: row.userId,
      title: row.title,
      slug: row.slug,
      description: row.description,
      hightlights: row.hightlights,
      majorId: row.majorId?.toString() ?? '',
      courseId: row.courseId?.toString() ?? '',
      media: this.toDomainMedia(row.media),
      price: row.price,
      isVerified: row.isVerified,
      status: row.status,
      discountBundle: row.discountBundle,
      collectionId: this.toPersistenceOptionalStringId(row.collectionId),
      resourceIds: this.toPersistenceStringIdArray(row.resourceIds),
      collectionIds: this.toPersistenceStringIdArray(row.collectionIds),
      steps: row.steps?.map((step) => ({
        title: step.title,
        resources: step.resources.map((r) => ({
          resourceId: r.resourceId.toString(),
          instructionNote: r.instructionNote,
        })),
      })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt ?? undefined,
    });
  }

  /**
   * Executes the to query item operation.
   *
   * @param row - The row parameter
   * @returns Result of type TutorialQueryItem
   */
  private toQueryItem(row: TutorialQueryWithPopulate): TutorialQueryItem {
    return {
      id: row._id.toString(),
      userId: row.userId,
      title: row.title,
      slug: row.slug,
      description: row.description,
      hightlights: row.hightlights,
      majorId: row.majorId?.toString() ?? '',
      courseId: row.courseId?.toString() ?? '',
      price: row.price,
      status: row.status,
      moderationStatus:
        row.moderationStatus ??
        (row.status === TutorialStatus.AVAILABLE
          ? ContentModerationStatus.APPROVED
          : ContentModerationStatus.PENDING),
      moderationScore: row.moderationScore ?? null,
      moderationReasons: row.moderationReasons ?? [],
      moderationRuleVersion: row.moderationRuleVersion ?? null,
      moderatedAt: row.moderatedAt ?? null,
      isVerified: row.isVerified,
      discountBundle: row.discountBundle,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt ?? null,
      collectionId: this.toQueryNullableStringId(row.collectionId),
      collection: this.toQueryCollectionDetails(row.collectionId),
      resourceIds: this.toQueryResourceIds(row.resourceIds),
      resources: this.toQueryResourcesArray(row.resourceIds),
      collectionIds: this.toQueryStringIdArray(row.collectionIds),
      steps: row.steps?.map((step) => ({
        title: step.title,
        resources: step.resources.map((r) => {
          return {
            resourceId: r.resourceId.toString(),
            instructionNote: r.instructionNote,
            resource:
              r.resource && typeof r.resource === 'object' && '_id' in r.resource
                ? {
                    id: r.resource._id.toString(),
                    slug: r.resource.slug,
                    title: r.resource.title,
                    summary: r.resource.summary,
                  }
                : undefined,
          };
        }),
      })),
      trailerUrl: row.media?.trailerUrl ?? null,
      thumbnailUrl: this.deriveCloudinaryThumbnail(row.media?.trailerUrl),
      major: row.major
        ? {
            id: row.major._id.toString(),
            code: row.major.code,
            name: row.major.name,
            description: row.major.description,
            status: row.major.status,
          }
        : undefined,
      course: row.course
        ? {
            id: row.course._id.toString(),
            code: row.course.code,
            name: row.course.name,
            credits: row.course.credits,
            semester: row.course.semester,
            isCompulsory: row.course.isCompulsory,
            status: row.course.status,
          }
        : undefined,
      _count: {
        tutorialMedia: row.media ? 1 : 0,
        tutorialOrders: 0,
      },
    };
  }

  /**
   * Executes the to persistence operation.
   *
   * @param tutorial - The tutorial parameter
   * @returns Result of type TutorialWritePayload
   */
  private toPersistence(tutorial: Tutorial): TutorialWritePayload {
    const payload: TutorialWritePayload = {
      _id: new Types.ObjectId(tutorial.id),
      userId: tutorial.userId,
      title: tutorial.title,
      slug: tutorial.slug,
      description: tutorial.description,
      hightlights: tutorial.hightlights,
      majorId: tutorial.majorId,
      courseId: tutorial.courseId,
      media: {
        fileId: tutorial.media.fileId,
        videoUrl: tutorial.media.videoUrl,
        streamingUrl: tutorial.media.streamingUrl ?? null,
        trailerUrl: tutorial.media.trailerUrl ?? null,
        duration: tutorial.media.duration!,
        fileSize: tutorial.media.fileSize!,
        extension: tutorial.media.extension,
      },
      price: tutorial.price,
      isVerified: tutorial.isVerified,
      status: tutorial.status,
      discountBundle: tutorial.discountBundle,
      createdAt: tutorial.createdAt ?? new Date(),
      updatedAt: tutorial.updatedAt ?? new Date(),
    };

    if (tutorial.deletedAt) {
      payload.deletedAt = tutorial.deletedAt;
    }

    if (tutorial.collectionId) {
      payload.collectionId = tutorial.collectionId;
    }

    if (tutorial.resourceIds) {
      payload.resourceIds = tutorial.resourceIds;
    }

    if (tutorial.collectionIds) {
      payload.collectionIds = tutorial.collectionIds;
    }

    if (tutorial.steps) {
      payload.steps = tutorial.steps;
    }

    return payload;
  }

  /**
   * Executes the to domain media operation.
   *
   * @param media - The media parameter
   * @returns Result of type TutorialMedia
   */
  private toDomainMedia(media: TutorialMediaSchemaShape): TutorialMedia {
    return {
      fileId: media.fileId,
      videoUrl: media.videoUrl,
      streamingUrl: media.streamingUrl ?? null,
      trailerUrl: media.trailerUrl ?? null,
      duration: media.duration,
      fileSize: media.fileSize,
      extension: media.extension,
    };
  }

  /**
   * Derives a thumbnail URL from a Cloudinary video trailer URL.
   * Uses Cloudinary's on-the-fly video-to-image transformation:
   *   /video/upload/ → /video/upload/so_0,w_640,h_360,c_fill/
   * Then swaps the file extension to .jpg.
   *
   * @param trailerUrl - Cloudinary video URL (or null/undefined)
   * @returns Thumbnail URL string, or null if no trailer URL
   */
  private deriveCloudinaryThumbnail(trailerUrl: string | null | undefined): string | null {
    if (!trailerUrl) return null;
    try {
      return trailerUrl
        .replace('/video/upload/', '/video/upload/so_0,w_640,h_360,c_fill/')
        .replace(/\.\w+$/, '.jpg');
    } catch {
      return null;
    }
  }

  // ============================================
  // PERSISTENCE HELPERS (For writes)
  // Handle only ObjectId/string - no populate
  // ============================================

  /**
   * Executes the to persistence optional string id operation.
   *
   * @param value - The value parameter
   * @returns Result of type string | undefined
   */
  private toPersistenceOptionalStringId(
    value: Types.ObjectId | string | null | undefined,
  ): string | undefined {
    if (!value) {
      return undefined;
    }
    return value.toString();
  }

  /**
   * Executes the to persistence string id array operation.
   *
   * @param value - The value parameter
   * @returns Result of type string[] | undefined
   */
  private toPersistenceStringIdArray(
    value?: Array<Types.ObjectId | string> | null,
  ): string[] | undefined {
    if (!value || value.length === 0) {
      return undefined;
    }
    return value.map((item) => item.toString());
  }

  // ============================================
  // QUERY HELPERS (For reads)
  // Handle ObjectId/string IDs and populated objects
  // ============================================

  /**
   * Executes the to query nullable string id operation.
   *
   * @param value - The value parameter
   * @returns Result of type string | null
   */
  private toQueryNullableStringId(
    value:
      | Types.ObjectId
      | string
      | {
          _id?: Types.ObjectId | string;
          title?: string;
        }
      | null
      | undefined,
  ): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'object' && '_id' in value) {
      const nestedId = value._id;
      if (nestedId) {
        return nestedId.toString();
      }
    }

    return value.toString();
  }

  /**
   * Executes the to query string id array operation.
   *
   * @param value - The value parameter
   * @returns Result of type string[] | null
   */
  private toQueryStringIdArray(value?: Array<Types.ObjectId | string> | null): string[] | null {
    if (!value || value.length === 0) {
      return null;
    }
    return value.map((item) => item.toString());
  }

  /**
   * Executes the to query collection details operation.
   *
   * @param value - The value parameter
   * @returns Result of type TutorialCollectionDetails | null
   */
  private toQueryCollectionDetails(
    value:
      | Types.ObjectId
      | string
      | {
          _id?: Types.ObjectId | string;
          userId?: string;
          title?: string;
          description?: string;
          hightlights?: string[];
          type?: string;
          discount?: number;
          status?: string;
          createdAt?: Date;
          updatedAt?: Date;
          deletedAt?: Date | null;
        }
      | null
      | undefined,
  ): TutorialCollectionDetails | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    // Check if it's a populated collection object
    if ('userId' in value && 'title' in value) {
      return {
        _id: value._id ? value._id.toString() : '',
        userId: value.userId ?? '',
        title: value.title ?? '',
        description: value.description ?? '',
        hightlights: value.hightlights ?? [],
        type: value.type ?? '',
        discount: value.discount ?? 0,
        status: value.status ?? '',
        createdAt: value.createdAt ?? new Date(),
        updatedAt: value.updatedAt ?? new Date(),
        deletedAt: value.deletedAt ?? null,
      };
    }

    return null;
  }

  /**
   * Executes the to query resource ids operation.
   *
   * @param value - The value parameter
   * @returns Result of type string[] | null
   */
  private toQueryResourceIds(
    value?: Array<
      | Types.ObjectId
      | string
      | {
          _id?: Types.ObjectId | string;
          userId?: string;
        }
    > | null,
  ): string[] | null {
    if (!value || value.length === 0) {
      return null;
    }

    return value.map((item) => {
      if (typeof item === 'object' && '_id' in item) {
        return item._id!.toString();
      }
      return (item as Types.ObjectId | string).toString();
    });
  }

  /**
   * Executes the to query resources array operation.
   *
   * @param value - The value parameter
   * @returns Result of type TutorialResourceDetails[] | null
   */
  private toQueryResourcesArray(
    value?: Array<
      | Types.ObjectId
      | string
      | {
          _id?: Types.ObjectId | string;
          userId?: string;
          title?: string;
          summary?: string;
          price?: number;
          status?: string;
          isVerified?: boolean;
          createdAt?: Date;
          updatedAt?: Date;
          deletedAt?: Date | null;
        }
    > | null,
  ): TutorialResourceDetails[] | null {
    if (!value || value.length === 0) {
      return null;
    }

    const resources: TutorialResourceDetails[] = [];

    for (const item of value) {
      if (
        typeof item === 'object' &&
        item !== null &&
        '_id' in item &&
        'userId' in item &&
        'title' in item
      ) {
        const resource = item as {
          _id?: Types.ObjectId | string;
          userId?: string;
          title?: string;
          slug?: string;
          summary?: string;
          hightlights?: string[];
          price?: number;
          status?: string;
          isVerified?: boolean;
          createdAt?: Date;
          updatedAt?: Date;
          deletedAt?: Date | null;
        };
        resources.push({
          _id: resource._id ? resource._id.toString() : '',
          userId: resource.userId ?? '',
          title: resource.title ?? '',
          slug: resource.slug ?? '',
          summary: resource.summary ?? '',
          hightlights: resource.hightlights ?? [],
          price: resource.price ?? 0,
          status: resource.status ?? '',
          resourceVerified: resource.isVerified ?? false,
          createdAt: resource.createdAt ?? new Date(),
          updatedAt: resource.updatedAt ?? new Date(),
          deletedAt: resource.deletedAt ?? null,
        });
      }
    }

    return resources.length > 0 ? resources : null;
  }

  /**
   * Update tutorial by fileId (from file.processed event consumer).
   * Finds tutorial with media.fileId == fileId and updates:
   * - media.streamingUrl, media.trailerUrl, media.fileSize
   * - status → PROCESSING (awaiting content moderation)
   * - resets moderation fields (moderationStatus → PENDING, score/version/date → null, reasons → [])
   */
  async updateByFileId(
    fileId: string,
    params: { streamingUrl?: string; trailerUrl?: string; fileSize?: number },
    options?: { session?: unknown },
  ): Promise<void> {
    const { streamingUrl, trailerUrl, fileSize } = params;

    const updatePayload: Record<string, any> = {
      status: TutorialStatus.PROCESSING,
      moderationStatus: ContentModerationStatus.PENDING,
      moderationScore: null,
      moderationReasons: [],
      moderationRuleVersion: null,
      moderatedAt: null,
    };

    if (streamingUrl !== undefined) {
      updatePayload['media.streamingUrl'] = streamingUrl;
    }

    if (trailerUrl !== undefined) {
      updatePayload['media.trailerUrl'] = trailerUrl;
    }

    if (fileSize !== undefined) {
      updatePayload['media.fileSize'] = fileSize;
    }

    const query = this.tutorialModel.updateOne({ 'media.fileId': fileId }, { $set: updatePayload });
    const session = options?.session as ClientSession | undefined;
    if (session) {
      query.session(session);
    }
    const result = await query.exec();

    if (result.modifiedCount === 0) {
      // Log but don't throw - allow processing to continue
      console.warn(`[TutorialMongoRepository] updateByFileId failed: fileId=${fileId} not found`);
    }
  }

  /**
   * Executes the mark failed by file id operation.
   *
   * @param fileId - The fileId parameter
   * @param options - The options parameter
   */
  async markFailedByFileId(fileId: string, options?: { session?: unknown }): Promise<void> {
    const query = this.tutorialModel.updateOne(
      { 'media.fileId': fileId },
      { $set: { status: TutorialStatus.FAILED } },
    );
    const session = options?.session as ClientSession | undefined;
    if (session) {
      query.session(session);
    }
    const result = await query.exec();

    if (result.modifiedCount === 0) {
      console.warn(
        `[TutorialMongoRepository] markFailedByFileId failed: fileId=${fileId} not found`,
      );
    }
  }

  async applyModerationResult(
    tutorialId: string,
    result: ContentModerationPersistenceResult,
    options?: { session?: unknown },
  ): Promise<void> {
    const status =
      result.status === ContentModerationStatus.APPROVED
        ? TutorialStatus.AVAILABLE
        : result.status === ContentModerationStatus.REJECTED
          ? TutorialStatus.BANNED
          : result.status === ContentModerationStatus.ERROR
            ? TutorialStatus.FAILED
            : TutorialStatus.PROCESSING;

    const query = this.tutorialModel.updateOne(
      { _id: tutorialId, deletedAt: null },
      {
        $set: {
          status,
          moderationStatus: result.status,
          moderationScore: result.score ?? null,
          moderationReasons: result.reasons,
          moderationRuleVersion: result.ruleVersion ?? null,
          moderatedAt: new Date(),
        },
      },
    );
    const session = options?.session as ClientSession | undefined;
    if (session) {
      query.session(session);
    }
    const updateResult = await query.exec();

    if (updateResult.modifiedCount === 0) {
      console.warn(
        `[TutorialMongoRepository] applyModerationResult failed: tutorialId=${tutorialId}`,
      );
    }
  }
}
