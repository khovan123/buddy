import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, InferSchemaType, Model, Types } from 'mongoose';

import { Resource, ResourceMeta } from '../../../../domain/entities/resource.entity';
import {
  ContentModerationPersistenceResult,
  IResourceRepository,
  ResourceCollectionDetails,
  ResourceListQueryParams,
  ResourceQueryItem,
  ResourceQueryResult,
} from '../../../../domain/repositories/resource.repository.interface';
import { CourseSchema } from '../schemas/course.schema';
import { MajorSchema } from '../schemas/major.schema';
import {
  ContentModerationStatus,
  ResourceDocument,
  ResourceSchema,
  Resource as ResourceSchemaClass,
  ResourceStatus,
} from '../schemas/resource.schema';

export type MajorLean = InferSchemaType<typeof MajorSchema> & { _id: Types.ObjectId };
export type CourseLean = InferSchemaType<typeof CourseSchema> & { _id: Types.ObjectId };

type ResourceSchemaShape = InferSchemaType<typeof ResourceSchema>;
type ResourceMetaSchemaShape = ResourceSchemaShape['meta'][number];

/**
 * Persistence type: DB writes without populate
 * Used for toDomain() - receives raw ObjectId/string values only
 */
type ResourcePersistenceLean = ResourceSchemaShape & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  majorId?: Types.ObjectId | string;
  courseId?: Types.ObjectId | string;
  tutorialId?: Types.ObjectId | string | null;
  collectionId?: Types.ObjectId | string | null;
};

/**
 * Query type for read queries WITH populated Collection object
 * Used when calling .populate('collectionId')
 */
type ResourceQueryWithPopulate = Omit<ResourceSchemaShape, 'collectionId'> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  majorId?: Types.ObjectId | string;
  courseId?: Types.ObjectId | string;
  tutorialId?: Types.ObjectId | string | null;
  collectionId?: Types.ObjectId | string | null;

  collection?: ResourceCollectionDetails | null;
  major?: MajorLean | null;
  course?: CourseLean | null;
};

type ResourceWritePayload = {
  _id: Types.ObjectId;
  userId: string;
  title: string;
  slug: string;
  summary: string;
  hightlights: string[];
  majorId: string;
  courseId: string;
  price: number;
  status: ResourceStatus;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  thumbnailUrl?: string;
  primaryS3Key?: string;
  deletedAt?: Date;
  tutorialId?: string;
  collectionId?: string;
  meta: ResourceMetaSchemaShape[];
};

type ResourceSearchClause =
  | { title: { $regex: string; $options: string } }
  | { summary: { $regex: string; $options: string } };

/** Repository interface/implementation for  resource mongo data access. */
@Injectable()
export class ResourceMongoRepository implements IResourceRepository {
  constructor(
    @InjectModel(ResourceSchemaClass.name)
    private readonly resourceModel: Model<ResourceDocument>,
  ) {}

  /**
   * Executes the save operation.
   *
   * @param resource - The resource parameter
   */
  async save(resource: Resource): Promise<void> {
    await this.resourceModel.create(this.toPersistence(resource));
  }

  /**
   * Executes the save meta operation.
   *
   * @param resourceId - The resourceId parameter
   * @param resourceMeta - The resourceMeta parameter
   */
  async saveMeta(resourceId: string, resourceMeta: ResourceMeta): Promise<void> {
    await this.resourceModel
      .updateOne(
        { _id: resourceId },
        {
          $push: {
            meta: {
              fileId: resourceMeta.fileId,
              downloadUrl: resourceMeta.downloadUrl,
              fileSize: resourceMeta.fileSize,
              extension: resourceMeta.extension,
            },
          },
        },
      )
      .exec();
  }

  /**
   * Executes the delete all by user id operation.
   *
   * @param userId - The userId parameter
   */
  async deleteAllByUserId(userId: string): Promise<void> {
    await this.resourceModel.deleteMany({ userId }).exec();
  }

  /**
   * Executes the delete all meta by resource id operation.
   *
   * @param resourceId - The resourceId parameter
   */
  async deleteAllMetaByResourceId(resourceId: string): Promise<void> {
    await this.resourceModel.updateOne({ _id: resourceId }, { $set: { meta: [] } }).exec();
  }

  /**
   * Executes the find by id operation.
   *
   * @param id - The id parameter
   * @returns Result of type Promise<Resource | null>
   */
  async findById(id: string): Promise<Resource | null> {
    const row = await this.resourceModel
      .findById(id)
      .populate('major')
      .populate('course')
      .lean<ResourcePersistenceLean>()
      .exec();
    return row ? this.toDomain(row) : null;
  }

  /**
   * Executes the find by ids operation.
   *
   * @param ids - The ids parameter
   * @returns Result of type Promise<Resource[]>
   */
  async findByIds(ids: string[]): Promise<Resource[]> {
    const rows = await this.resourceModel
      .find({ _id: { $in: ids } })
      .populate('major')
      .populate('course')
      .lean<ResourcePersistenceLean[]>()
      .exec();
    return rows.map((row) => this.toDomain(row));
  }

  /**
   * Executes the find by slug operation.
   *
   * @param slug - The slug parameter
   * @returns Result of type Promise<Resource | null>
   */
  async findBySlug(slug: string): Promise<Resource | null> {
    const row = await this.resourceModel
      .findOne({ slug })
      .populate('major')
      .populate('course')
      .lean<ResourcePersistenceLean>()
      .exec();
    return row ? this.toDomain(row) : null;
  }

  /**
   * Executes the find meta by id operation.
   *
   * @param id - The id parameter
   * @returns Result of type Promise<ResourceMeta | null>
   */
  async findMetaById(id: string): Promise<ResourceMeta | null> {
    const row = await this.resourceModel
      .findOne(
        { 'meta.fileId': id },
        {
          _id: 1,
          meta: { $elemMatch: { fileId: id } },
        },
      )
      .lean<{ meta?: ResourceMetaSchemaShape[] }>()
      .exec();

    const first = Array.isArray(row?.meta) ? row.meta[0] : undefined;
    if (!row || !first) {
      return null;
    }

    return this.toDomainMeta(first);
  }

  /**
   * Executes the find meta by resource id operation.
   *
   * @param resourceId - The resourceId parameter
   * @returns Result of type Promise<ResourceMeta[] | null>
   */
  async findMetaByResourceId(resourceId: string): Promise<ResourceMeta[] | null> {
    const row = await this.resourceModel
      .findById(resourceId, { _id: 1, meta: 1 })
      .lean<{ meta?: ResourceMetaSchemaShape[] }>()
      .exec();

    if (!row || !Array.isArray(row.meta) || row.meta.length === 0) {
      return null;
    }

    return row.meta.map((meta) => this.toDomainMeta(meta));
  }

  /**
   * Executes the find by id with details operation.
   *
   * @param id - The id parameter
   * @returns Result of type Promise<ResourceQueryItem | null>
   */
  async findByIdWithDetails(id: string): Promise<ResourceQueryItem | null> {
    const row = await this.resourceModel
      .findById(id)
      .populate<Pick<ResourceQueryWithPopulate, 'collectionId'>>('collectionId')
      .populate('major')
      .populate('course')
      .lean<ResourceQueryWithPopulate>()
      .exec();

    return row ? this.toQueryItem(row) : null;
  }

  /**
   * Executes the find by ids with details operation.
   *
   * @param ids - The ids parameter
   * @returns Result of type Promise<ResourceQueryItem[]>
   */
  async findByIdsWithDetails(ids: string[]): Promise<ResourceQueryItem[]> {
    if (!ids || ids.length === 0) return [];
    const rows = await this.resourceModel
      .find({ _id: { $in: ids } })
      .populate<Pick<ResourceQueryWithPopulate, 'collectionId'>>('collectionId')
      .populate('major')
      .populate('course')
      .lean<ResourceQueryWithPopulate[]>()
      .exec();

    return rows.map((row) => this.toQueryItem(row));
  }

  /**
   * Executes the find by slug with details operation.
   *
   * @param slug - The slug parameter
   * @returns Result of type Promise<ResourceQueryItem | null>
   */
  async findBySlugWithDetails(slug: string): Promise<ResourceQueryItem | null> {
    const row = await this.resourceModel
      .findOne({ slug })
      .populate<Pick<ResourceQueryWithPopulate, 'collectionId'>>('collectionId')
      .populate('major')
      .populate('course')
      .lean<ResourceQueryWithPopulate>()
      .exec();

    return row ? this.toQueryItem(row) : null;
  }

  /**
   * Executes the find available resources operation.
   *
   * @param params - The params parameter
   * @returns Result of type Promise<ResourceQueryResult>
   */
  async findAvailableResources(params: ResourceListQueryParams): Promise<ResourceQueryResult> {
    return this.findPagedResources({
      ...params,
    });
  }

  /**
   * Executes the find my resources operation.
   *
   * @param params - The params parameter
   * @returns Result of type Promise<ResourceQueryResult>
   */
  async findMyResources(params: ResourceListQueryParams): Promise<ResourceQueryResult> {
    return this.findPagedMyResources({
      ...params,
    });
  }

  /**
   * Executes the find available resource collections operation.
   *
   * @param params - The params parameter
   * @returns Result of type Promise<ResourceQueryResult>
   */
  async findAvailableResourceCollections(
    params: ResourceListQueryParams,
  ): Promise<ResourceQueryResult> {
    return this.findPagedResources({
      ...params,
      collectionId: { $ne: null },
    });
  }

  /**
   * Executes the update operation.
   *
   * @param resource - The resource parameter
   */
  async update(resource: Resource): Promise<void> {
    const persistence = this.toPersistence(resource);
    const data: Partial<ResourceWritePayload> = { ...persistence };
    delete data._id;
    await this.resourceModel.updateOne({ _id: resource.id }, data).exec();
  }

  /**
   * Executes the update meta operation.
   *
   * @param resourceId - The resourceId parameter
   * @param fileId - The fileId parameter
   * @param resourceMeta - The resourceMeta parameter
   */
  async updateMeta(resourceId: string, fileId: string, resourceMeta: ResourceMeta): Promise<void> {
    await this.resourceModel
      .updateOne(
        { _id: resourceId, 'meta.fileId': fileId },
        {
          $set: {
            'meta.$.downloadUrl': resourceMeta.downloadUrl,
            'meta.$.fileSize': resourceMeta.fileSize,
            'meta.$.extension': resourceMeta.extension,
          },
        },
      )
      .exec();
  }

  /**
   * Executes the complete upload operation.
   *
   * @param resourceId - The resourceId parameter
   * @param meta - The meta parameter
   * @param options - The options parameter
   */
  async completeUpload(
    resourceId: string,
    meta: ResourceMeta[],
    options?: { session?: unknown },
  ): Promise<void> {
    const primaryS3Key = meta.length > 0 ? meta[0].s3Key : null;

    const query = this.resourceModel.updateOne(
      { _id: resourceId, deletedAt: null },
      {
        $set: {
          status: ResourceStatus.PROCESSING,
          moderationStatus: ContentModerationStatus.PENDING,
          moderationScore: null,
          moderationReasons: [],
          moderationRuleVersion: null,
          moderatedAt: null,
          meta,
          ...(primaryS3Key ? { primaryS3Key } : {}),
        },
      },
    );

    const session = options?.session as ClientSession | undefined;
    if (session) {
      query.session(session);
    }

    const result = await query.exec();
    if (result.modifiedCount === 0) {
      throw new Error(`[ResourceMongoRepository] completeUpload failed: resourceId=${resourceId}`);
    }
  }

  /**
   * Executes the delete operation.
   *
   * @param id - The id parameter
   */
  async delete(id: string): Promise<void> {
    await this.resourceModel.deleteOne({ _id: id }).exec();
  }

  /**
   * Executes the delete pending older than operation.
   *
   * @param cutoff - The cutoff parameter
   * @returns Result of type Promise<number>
   */
  async deletePendingOlderThan(cutoff: Date): Promise<number> {
    const result = await this.resourceModel
      .deleteMany({
        status: ResourceStatus.PENDING,
        createdAt: { $lt: cutoff },
      })
      .exec();

    return result.deletedCount ?? 0;
  }

  /**
   * Executes the delete meta operation.
   *
   * @param id - The id parameter
   */
  async deleteMeta(id: string): Promise<void> {
    await this.resourceModel.updateMany({}, { $pull: { meta: { fileId: id } } }).exec();
  }

  /**
   * Find resources for a given course that are NOT assigned to any collection.
   *
   * @param courseId - The courseId to filter by
   * @param limit - Max number of results
   * @returns Result of type Promise<ResourceQueryItem[]>
   */
  async findUncollectedResources(courseId: string, limit: number): Promise<ResourceQueryItem[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const rows = await this.resourceModel
      .find({
        status: ResourceStatus.AVAILABLE,
        deletedAt: null,
        courseId,
        $or: [{ collectionId: null }, { collectionId: { $exists: false } }],
      })
      .populate('major')
      .populate('course')
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean<ResourceQueryWithPopulate[]>()
      .exec();
    return rows.map((row) => this.toQueryItem(row));
  }

  /**
   * Executes the find top resources operation.
   *
   * @param limit - The limit parameter
   * @returns Result of type Promise<ResourceQueryItem[]>
   */
  async findTopResources(
    limit: number,
    search?: string,
    semester?: number,
    majorId?: string,
  ): Promise<ResourceQueryItem[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 20);
    const filter: Record<string, unknown> = {
      status: ResourceStatus.AVAILABLE,
      deletedAt: null,
      // collectionId: null,
      // tutorialId: null,
    };

    if (majorId) {
      filter.majorId = new Types.ObjectId(majorId);
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { summary: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    if (semester) {
      const CourseModel = this.resourceModel.db.model('Course');
      const matchingCourseIds = await CourseModel.find({ semester, deletedAt: null }, { _id: 1 })
        .lean<{ _id: Types.ObjectId }[]>()
        .exec();
      filter.courseId = { $in: matchingCourseIds.map((c) => c._id) };
    }

    const rows = await this.resourceModel
      .find(filter)
      .populate<Pick<ResourceQueryWithPopulate, 'collectionId'>>('collectionId')
      .populate('major')
      .populate('course')
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean<ResourceQueryWithPopulate[]>()
      .exec();

    return rows.map((row) => this.toQueryItem(row));
  }

  /**
   * Executes the find paged resources operation.
   *
   * @param params - The params parameter
   * @returns Result of type Promise<ResourceQueryResult>
   */
  private async findPagedResources(
    params: ResourceListQueryParams & {
      collectionId?: null | { $ne: null };
    },
  ): Promise<ResourceQueryResult> {
    const { page, limit, search, userId, collectionId, semester, majorId } = params;
    const safeLimit = Math.max(limit, 1);
    const skip = (page - 1) * safeLimit;

    const filter: Record<string, unknown> = {
      status: ResourceStatus.AVAILABLE,
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
        { summary: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    // If semester is specified, find courseIds that match the semester first
    if (semester) {
      const CourseModel = this.resourceModel.db.model('Course');
      const matchingCourseIds = await CourseModel.find({ semester, deletedAt: null }, { _id: 1 })
        .lean<{ _id: Types.ObjectId }[]>()
        .exec();
      filter.courseId = { $in: matchingCourseIds.map((c) => c._id) };
    }

    const [rows, total] = await Promise.all([
      this.resourceModel
        .find(filter)
        .populate<Pick<ResourceQueryWithPopulate, 'collectionId'>>('collectionId')
        .populate('major')
        .populate('course')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean<ResourceQueryWithPopulate[]>()
        .exec(),
      this.resourceModel.countDocuments(filter).exec(),
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
   * Executes the find paged my resources operation.
   *
   * @param params - The params parameter
   * @returns Result of type Promise<ResourceQueryResult>
   */
  private async findPagedMyResources(
    params: ResourceListQueryParams,
  ): Promise<ResourceQueryResult> {
    const { page, limit, search, userId } = params;
    const safeLimit = Math.max(limit, 1);
    const skip = (page - 1) * safeLimit;

    // Do NOT filter by status: ResourceStatus.AVAILABLE
    const filter: {
      deletedAt: null;
      userId?: string;
      $or?: ResourceSearchClause[];
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
        { summary: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.resourceModel
        .find(filter)
        .populate<Pick<ResourceQueryWithPopulate, 'collectionId'>>('collectionId')
        .populate('major')
        .populate('course')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean<ResourceQueryWithPopulate[]>()
        .exec(),
      this.resourceModel.countDocuments(filter).exec(),
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
   * @returns Result of type Resource
   */
  private toDomain(row: ResourcePersistenceLean): Resource {
    return Resource.reconstitute({
      id: row._id.toString(),
      userId: row.userId,
      title: row.title,
      slug: row.slug,
      summary: row.summary,
      hightlights: row.hightlights,
      majorId: row.majorId?.toString() ?? '',
      courseId: row.courseId?.toString() ?? '',
      price: row.price,
      status: row.status,
      isVerified: row.isVerified,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      thumbnailUrl: row.thumbnailUrl ?? undefined,
      primaryS3Key: row.primaryS3Key ?? undefined,
      deletedAt: row.deletedAt ?? undefined,
      tutorialId: this.toPersistenceOptionalStringId(row.tutorialId),
      collectionId: this.toPersistenceOptionalStringId(row.collectionId),
      meta: row.meta.map((meta) => this.toDomainMeta(meta)),
    });
  }

  /**
   * Executes the to query item operation.
   *
   * @param row - The row parameter
   * @returns Result of type ResourceQueryItem
   */
  private toQueryItem(row: ResourceQueryWithPopulate): ResourceQueryItem {
    return {
      id: row._id.toString(),
      userId: row.userId,
      title: row.title,
      slug: row.slug,
      summary: row.summary,
      hightlights: row.hightlights,
      majorId: row.majorId?.toString() ?? '',
      courseId: row.courseId?.toString() ?? '',
      price: row.price,
      status: row.status,
      // Legacy documents predating the moderation system have no
      // moderationStatus field.  Defaulting blindly to PENDING would
      // make every published resource appear as "awaiting moderation"
      // in the UI.  Instead, infer APPROVED for resources already in
      // AVAILABLE status — they were implicitly approved before
      // moderation was introduced.
      moderationStatus:
        row.moderationStatus ??
        (row.status === 'AVAILABLE'
          ? ContentModerationStatus.APPROVED
          : ContentModerationStatus.PENDING),
      moderationScore: row.moderationScore ?? null,
      moderationReasons: row.moderationReasons ?? [],
      moderationRuleVersion: row.moderationRuleVersion ?? null,
      moderatedAt: row.moderatedAt ?? null,
      resourceVerified: row.isVerified,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      thumbnailUrl: row.thumbnailUrl ?? null,
      deletedAt: row.deletedAt ?? null,
      tutorialId: this.toQueryNullableStringId(row.tutorialId),
      collectionId: this.toQueryNullableStringId(row.collectionId),
      collection: this.toQueryCollectionDetails(row.collectionId),
      primaryS3Key: row.primaryS3Key ?? null,
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
        resourceMeta: row.meta.length,
        resourceOrders: 0,
      },
    };
  }

  /**
   * Executes the to persistence operation.
   *
   * @param resource - The resource parameter
   * @returns Result of type ResourceWritePayload
   */
  private toPersistence(resource: Resource): ResourceWritePayload {
    const payload: ResourceWritePayload = {
      _id: new Types.ObjectId(resource.id),
      userId: resource.userId,
      title: resource.title,
      slug: resource.slug,
      summary: resource.summary,
      hightlights: resource.hightlights,
      majorId: resource.majorId,
      courseId: resource.courseId,
      price: resource.price,
      status: resource.status,
      isVerified: resource.isVerified,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
      thumbnailUrl: resource.thumbnailUrl,
      meta: resource.meta.map((meta) => ({
        fileId: meta.fileId,
        downloadUrl: meta.downloadUrl,
        fileSize: meta.fileSize,
        extension: meta.extension,
      })),
    };

    if (resource.deletedAt) {
      payload.deletedAt = resource.deletedAt;
    }

    if (resource.thumbnailUrl) {
      payload.thumbnailUrl = resource.thumbnailUrl;
    }

    if (resource.primaryS3Key) {
      payload.primaryS3Key = resource.primaryS3Key;
    }

    if (resource.tutorialId) {
      payload.tutorialId = resource.tutorialId;
    }

    if (resource.collectionId) {
      payload.collectionId = resource.collectionId;
    }

    return payload;
  }

  /**
   * Executes the to domain meta operation.
   *
   * @param meta - The meta parameter
   * @returns Result of type ResourceMeta
   */
  private toDomainMeta(meta: ResourceMetaSchemaShape): ResourceMeta {
    return {
      fileId: meta.fileId,
      downloadUrl: meta.downloadUrl ?? '',
      fileSize: meta.fileSize,
      extension: meta.extension,
    };
  }

  // ============================================
  // PERSISTENCE HELPERS (For writes)
  // Handle only ObjectId/string - no autopopulate
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
          userId?: string;
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
   * Executes the to query collection details operation.
   *
   * @param value - The value parameter
   * @returns Result of type ResourceCollectionDetails | null
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
  ): ResourceCollectionDetails | null {
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
   * Update resource by fileId (from file.processed event consumer).
   * Finds resource with meta[].fileId == fileId and updates:
   * - meta[].downloadUrl, meta[].fileSize
   * - status: AVAILABLE
   */
  async updateByFileId(
    fileId: string,
    params: { downloadUrl?: string; fileSize?: number },
    options?: { session?: unknown },
  ): Promise<void> {
    const { downloadUrl, fileSize } = params;

    const updatePayload: Record<string, any> = {
      status: ResourceStatus.PROCESSING,
      moderationStatus: ContentModerationStatus.PENDING,
      moderationScore: null,
      moderationReasons: [],
      moderationRuleVersion: null,
      moderatedAt: null,
    };

    if (downloadUrl !== undefined) {
      updatePayload['meta.$.downloadUrl'] = downloadUrl;
    }

    if (fileSize !== undefined) {
      updatePayload['meta.$.fileSize'] = fileSize;
    }

    const query = this.resourceModel.updateOne({ 'meta.fileId': fileId }, { $set: updatePayload });
    const session = options?.session as ClientSession | undefined;
    if (session) {
      query.session(session);
    }
    const result = await query.exec();

    if (result.modifiedCount === 0) {
      // Log but don't throw - allow processing to continue
      console.warn(`[ResourceMongoRepository] updateByFileId failed: fileId=${fileId} not found`);
    }
  }

  /**
   * Executes the mark failed by file id operation.
   *
   * @param fileId - The fileId parameter
   * @param options - The options parameter
   */
  async markFailedByFileId(fileId: string, options?: { session?: unknown }): Promise<void> {
    const query = this.resourceModel.updateOne(
      { 'meta.fileId': fileId },
      { $set: { status: ResourceStatus.FAILED } },
    );
    const session = options?.session as ClientSession | undefined;
    if (session) {
      query.session(session);
    }
    const result = await query.exec();

    if (result.modifiedCount === 0) {
      console.warn(
        `[ResourceMongoRepository] markFailedByFileId failed: fileId=${fileId} not found`,
      );
    }
  }

  async applyModerationResult(
    resourceId: string,
    result: ContentModerationPersistenceResult,
    options?: { session?: unknown },
  ): Promise<void> {
    const status =
      result.status === ContentModerationStatus.APPROVED
        ? ResourceStatus.AVAILABLE
        : result.status === ContentModerationStatus.REJECTED
          ? ResourceStatus.BANNED
          : ResourceStatus.PROCESSING;

    const query = this.resourceModel.updateOne(
      { _id: resourceId, deletedAt: null },
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
        `[ResourceMongoRepository] applyModerationResult failed: resourceId=${resourceId}`,
      );
    }
  }
}
