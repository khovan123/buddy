import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InferSchemaType, Model, Types } from 'mongoose';

import { Collection } from '../../../../domain/entities/collection.entity';
import type { LearningFit } from '../../../../domain/entities/learning-fit';
import {
  CollectionListQueryParams,
  CollectionQueryItem,
  CollectionQueryResult,
  CollectionUpdateDetails,
  ICollectionRepository,
} from '../../../../domain/repositories/collection.repository.interface';
import {
  CollectionDocument,
  CollectionPhaseItemType,
  CollectionSchema,
  Collection as CollectionSchemaClass,
  CollectionStatus,
  CollectionType,
} from '../schemas/collection.schema';
import { CourseSchema } from '../schemas/course.schema';
import { MajorSchema } from '../schemas/major.schema';

export type CollectionSchemaShape = InferSchemaType<typeof CollectionSchema>;
export type MajorLean = InferSchemaType<typeof MajorSchema> & { _id: Types.ObjectId };
export type CourseLean = InferSchemaType<typeof CourseSchema> & { _id: Types.ObjectId };

type CollectionLean = CollectionSchemaShape & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  thumbnailUrl?: string;
  deletedAt?: Date | null;
  majorId?: Types.ObjectId | string;
  courseId?: Types.ObjectId | string;
  resourceIds?: Array<Types.ObjectId | string>;
  phases?: Array<{
    phaseTitle: string;
    learningGoal?: string;
    items?: Array<{ itemId: Types.ObjectId | string; itemType: CollectionPhaseItemType }>;
  }>;
  learningFit?: LearningFit | null;
};

type CollectionLeanWithItems = CollectionLean & {
  tutorials?: Array<unknown>;
  resources?: Array<unknown>;
  major?: MajorLean | null;
  course?: CourseLean | null;
};

type CollectionWritePayload = {
  _id: Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
  thumbnailUrl?: string;
  deletedAt?: Date;
  phases?: Array<{
    phaseTitle: string;
    learningGoal: string;
    items: Array<{ itemId: string; itemType: CollectionPhaseItemType }>;
  }>;
  learningFit?: LearningFit | null;
};

type CollectionSearchClause =
  | { title: { $regex: string; $options: string } }
  | { description: { $regex: string; $options: string } };

/** Repository interface/implementation for  collection mongo data access. */
@Injectable()
export class CollectionMongoRepository implements ICollectionRepository {
  constructor(
    @InjectModel(CollectionSchemaClass.name)
    private readonly collectionModel: Model<CollectionDocument>,
  ) {}

  /**
   * Executes the save operation.
   *
   * @param collection - The collection parameter
   */
  async save(collection: Collection): Promise<void> {
    await this.collectionModel.create(this.toPersistence(collection));
  }

  /**
   * Executes the delete all by user id operation.
   *
   * @param userId - The userId parameter
   */
  async deleteAllByUserId(userId: string): Promise<void> {
    await this.collectionModel.deleteMany({ userId }).exec();
  }

  /**
   * Executes the find by id operation.
   *
   * @param id - The id parameter
   * @returns Result of type Promise<Collection | null>
   */
  async findById(id: string): Promise<Collection | null> {
    const row = await this.collectionModel
      .findById(id)
      .populate('major')
      .populate('course')
      .lean<CollectionLean>()
      .exec();
    return row ? this.toDomain(row) : null;
  }

  /**
   * Executes the find by ids operation.
   *
   * @param ids - The ids parameter
   * @returns Result of type Promise<Collection[]>
   */
  async findByIds(ids: string[]): Promise<Collection[]> {
    const rows = await this.collectionModel
      .find({ _id: { $in: ids } })
      .populate('major')
      .populate('course')
      .lean<CollectionLean[]>()
      .exec();
    return rows.map((row) => this.toDomain(row));
  }

  /**
   * Executes the find by slug operation.
   *
   * @param slug - The slug parameter
   * @returns Result of type Promise<Collection | null>
   */
  async findBySlug(slug: string): Promise<Collection | null> {
    const row = await this.collectionModel
      .findOne({ slug })
      .populate('major')
      .populate('course')
      .lean<CollectionLean>()
      .exec();
    return row ? this.toDomain(row) : null;
  }

  /**
   * Executes the find by title operation.
   *
   * @param title - The title parameter
   * @returns Result of type Promise<Collection | null>
   */
  async findByTitle(title: string): Promise<Collection | null> {
    const row = await this.collectionModel
      .findOne({ title })
      .populate('major')
      .populate('course')
      .lean<CollectionLean>()
      .exec();
    return row ? this.toDomain(row) : null;
  }

  /**
   * Executes the find by id with type operation.
   *
   * @param id - The id parameter
   * @param type - The type parameter
   * @returns Result of type Promise<Collection | null>
   */
  async findByIdWithType(id: string, type: CollectionType): Promise<Collection | null> {
    const row = await this.collectionModel
      .findOne({ _id: id, type })
      .populate('major')
      .populate('course')
      .lean<CollectionLean>()
      .exec();
    return row ? this.toDomain(row) : null;
  }

  /**
   * Executes the find by id with details operation.
   *
   * @param id - The id parameter
   * @returns Result of type Promise<CollectionQueryItem | null>
   */
  async findByIdWithDetails(id: string): Promise<CollectionQueryItem | null> {
    const row = await this.collectionModel
      .findOne({ _id: id, deletedAt: null })
      .populate('major')
      .populate('course')
      .populate('tutorials', '_id')
      .populate('resources', '_id')
      .lean<CollectionLeanWithItems>()
      .exec();

    return row ? this.toQueryItem(row) : null;
  }

  /**
   * Executes the find by ids with details operation.
   *
   * @param ids - The ids parameter
   * @returns Result of type Promise<CollectionQueryItem[]>
   */
  async findByIdsWithDetails(ids: string[]): Promise<CollectionQueryItem[]> {
    if (!ids || ids.length === 0) return [];
    const rows = await this.collectionModel
      .find({ _id: { $in: ids }, deletedAt: null })
      .populate('major')
      .populate('course')
      .populate('tutorials', '_id')
      .populate('resources', '_id')
      .lean<CollectionLeanWithItems[]>()
      .exec();

    return rows.map((row) => this.toQueryItem(row));
  }

  /**
   * Executes the find by slug with details operation.
   *
   * @param slug - The slug parameter
   * @returns Result of type Promise<CollectionQueryItem | null>
   */
  async findBySlugWithDetails(slug: string): Promise<CollectionQueryItem | null> {
    const row = await this.collectionModel
      .findOne({ slug, deletedAt: null })
      .populate('major')
      .populate('course')
      .populate('tutorials', '_id')
      .populate('resources', '_id')
      .lean<CollectionLeanWithItems>()
      .exec();

    return row ? this.toQueryItem(row) : null;
  }

  /**
   * Executes the find available collections operation.
   *
   * @param params - The params parameter
   * @returns Result of type Promise<CollectionQueryResult>
   */
  async findAvailableCollections(
    params: CollectionListQueryParams,
  ): Promise<CollectionQueryResult> {
    const { page, limit, search, userId, type } = params;
    const safeLimit = Math.max(limit, 1);
    const skip = (page - 1) * safeLimit;

    const filter: {
      status: CollectionStatus;
      deletedAt: null;
      userId?: string;
      type?: CollectionType;
      $or?: CollectionSearchClause[];
    } = {
      status: CollectionStatus.AVAILABLE,
      deletedAt: null,
    };

    if (userId) {
      filter.userId = userId;
    }

    if (type) {
      filter.type = type;
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.collectionModel
        .find(filter)
        .populate('major')
        .populate('course')
        .populate('tutorials', '_id')
        .populate('resources', '_id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean<CollectionLeanWithItems[]>()
        .exec(),
      this.collectionModel.countDocuments(filter).exec(),
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
   * Executes the find top collections operation.
   *
   * @param limit - The limit parameter
   * @param type - The type parameter
   * @returns Result of type Promise<CollectionQueryItem[]>
   */
  async findTopCollections(
    limit: number,
    type: CollectionType,
    search?: string,
    semester?: number,
    majorId?: string,
  ): Promise<CollectionQueryItem[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 20);
    const filter: Record<string, unknown> = {
      status: CollectionStatus.AVAILABLE,
      deletedAt: null,
      type,
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
      const CourseModel = this.collectionModel.db.model('Course');
      const matchingCourseIds = await CourseModel.find({ semester, deletedAt: null }, { _id: 1 })
        .lean<{ _id: Types.ObjectId }[]>()
        .exec();
      filter.courseId = { $in: matchingCourseIds.map((c) => c._id) };
    }

    const rows = await this.collectionModel
      .find(filter)
      .populate('major')
      .populate('course')
      .populate('tutorials', '_id')
      .populate('resources', '_id')
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean<CollectionLeanWithItems[]>()
      .exec();

    return rows.map((row) => this.toQueryItem(row));
  }

  /**
   * Executes the update operation.
   *
   * @param collection - The collection parameter
   */
  async update(collection: Collection): Promise<void> {
    const persistence = this.toPersistence(collection);
    const data: Partial<CollectionWritePayload> = { ...persistence };
    delete data._id;
    await this.collectionModel.updateOne({ _id: collection.id }, data).exec();
  }

  async updateDetails(collectionId: string, details: CollectionUpdateDetails): Promise<void> {
    await this.collectionModel
      .updateOne(
        { _id: collectionId, deletedAt: null },
        {
          $set: {
            title: details.title,
            description: details.description,
            hightlights: details.hightlights,
            majorId: details.majorId,
            courseId: details.courseId,
            type: details.type,
            discount: details.discount,
            phases: details.phases ?? [],
            learningFit: details.learningFit ?? null,
            updatedAt: new Date(),
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
    await this.collectionModel.deleteOne({ _id: id }).exec();
  }

  /**
   * Executes the to domain operation.
   *
   * @param row - The row parameter
   * @returns Result of type Collection
   */
  private toDomain(row: CollectionLean): Collection {
    return Collection.reconstitute({
      id: row._id.toString(),
      userId: row.userId,
      title: row.title,
      slug: row.slug,
      description: row.description,
      hightlights: row.hightlights,
      majorId: row.majorId?.toString() ?? '',
      courseId: row.courseId?.toString() ?? '',
      resourceIds: Array.isArray(row.resourceIds) ? row.resourceIds.map((id) => id.toString()) : [],
      type: row.type,
      discount: row.discount,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      thumbnailUrl: row.thumbnailUrl ?? undefined,
      deletedAt: row.deletedAt ?? undefined,
      phases: row.phases?.map((p) => ({
        phaseTitle: p.phaseTitle,
        learningGoal: p.learningGoal ?? '',
        items: (p.items ?? []).map((item) => ({
          itemId: item.itemId?.toString() ?? '',
          itemType: item.itemType,
        })),
      })),
      learningFit: row.learningFit ?? null,
    });
  }

  /**
   * Executes the to query item operation.
   *
   * @param row - The row parameter
   * @returns Result of type CollectionQueryItem
   */
  private toQueryItem(row: CollectionLeanWithItems): CollectionQueryItem {
    return {
      id: row._id.toString(),
      userId: row.userId,
      title: row.title,
      slug: row.slug,
      description: row.description,
      hightlights: row.hightlights,
      majorId: row.majorId?.toString() ?? '',
      courseId: row.courseId?.toString() ?? '',
      type: row.type,
      discount: row.discount,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      thumbnailUrl: row.thumbnailUrl ?? null,
      deletedAt: row.deletedAt ?? null,
      _count: {
        tutorials: Array.isArray(row.tutorials) ? row.tutorials.length : 0,
        resources: Array.isArray(row.resources) ? row.resources.length : 0,
      },
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
      phases: row.phases?.map((p) => ({
        phaseTitle: p.phaseTitle,
        learningGoal: p.learningGoal ?? '',
        items: (p.items ?? []).map((item) => ({
          itemId: item.itemId?.toString() ?? '',
          itemType: item.itemType,
        })),
      })),
      learningFit: row.learningFit ?? null,
    };
  }

  /**
   * Executes the to persistence operation.
   *
   * @param collection - The collection parameter
   * @returns Result of type CollectionWritePayload
   */
  private toPersistence(collection: Collection): CollectionWritePayload {
    const payload: CollectionWritePayload = {
      _id: new Types.ObjectId(collection.id),
      userId: collection.userId,
      title: collection.title,
      slug: collection.slug,
      description: collection.description,
      hightlights: collection.hightlights,
      majorId: collection.majorId,
      courseId: collection.courseId,
      resourceIds: collection.resourceIds ?? [],
      type: collection.type,
      discount: collection.discount,
      status: collection.status,
      createdAt: collection.createdAt ?? new Date(),
      updatedAt: collection.updatedAt ?? new Date(),
      learningFit: collection.learningFit ?? null,
    };

    if (collection.deletedAt) {
      payload.deletedAt = collection.deletedAt;
    }

    if (collection.thumbnailUrl) {
      payload.thumbnailUrl = collection.thumbnailUrl;
    }

    if (collection.phases) {
      payload.phases = collection.phases.map((p) => ({
        phaseTitle: p.phaseTitle,
        learningGoal: p.learningGoal,
        items: p.items.map((item) => ({
          itemId: item.itemId,
          itemType: item.itemType,
        })),
      }));
    }

    return payload;
  }
}
