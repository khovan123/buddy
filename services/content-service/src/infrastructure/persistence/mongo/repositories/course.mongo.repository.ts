import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InferSchemaType, Model, Types } from 'mongoose';

import { CourseEntity } from '../../../../domain/entities/course.entity';
import { MajorStatus } from '../../../../domain/entities/major.entity';
import {
  CourseQueryItem,
  ICourseRepository,
} from '../../../../domain/repositories/course.repository.interface';
import {
  CourseDocument,
  CourseSchema,
  Course as CourseSchemaClass,
} from '../schemas/course.schema';

type MajorLean = {
  _id: Types.ObjectId | string;
  code: string;
  name: string;
  description: string;
  status: MajorStatus;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

type CoursePersistenceLean = InferSchemaType<typeof CourseSchema> & {
  _id: Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
};

type CourseQueryWithPopulate = CoursePersistenceLean & {
  major?: MajorLean | null;
  majors?: MajorLean[] | null;
};

/** Repository interface/implementation for  course mongo data access. */
@Injectable()
export class CourseMongoRepository implements ICourseRepository {
  constructor(
    @InjectModel(CourseSchemaClass.name)
    private readonly courseModel: Model<CourseDocument>,
  ) {}

  /**
   * Maps a raw document to a CourseEntity.
   *
   * @param doc - The raw document
   * @returns A CourseEntity instance
   */
  private toEntity(doc: CoursePersistenceLean): CourseEntity {
    return CourseEntity.reconstitute({
      id: doc._id.toString(),
      code: doc.code,
      name: doc.name,
      credits: doc.credits,
      semester: doc.semester,
      isCompulsory: doc.isCompulsory,
      majorIds: (doc.majorIds ?? []).map((id: any) => id.toString()),
      prerequisiteCourseIds: (doc.prerequisiteCourseIds ?? []).map((id: Types.ObjectId | string) =>
        id.toString(),
      ),
      status: doc.status,
      deletedAt: doc.deletedAt ?? undefined,
    });
  }

  /**
   * Executes the find all operation.
   *
   * @returns Result of type Promise<CourseQueryItem[]>
   */
  async findAll(): Promise<CourseQueryItem[]> {
    const rows = await this.courseModel
      .find({ deletedAt: null })
      .sort({ name: 1 })
      .populate('major')
      .populate('majors')
      .lean<CourseQueryWithPopulate[]>()
      .exec();
    return rows.map((r) => this.toQueryItem(r));
  }

  /**
   * Executes the find by id operation.
   *
   * @param id - The id parameter
   * @returns Result of type Promise<CourseEntity | null>
   */
  async findById(id: string): Promise<CourseEntity | null> {
    const row = await this.courseModel.findById(id).lean<CoursePersistenceLean>().exec();
    return row ? this.toEntity(row) : null;
  }

  /**
   * Executes the find by ids operation.
   *
   * @param ids - The ids parameter
   * @returns Result of type Promise<CourseEntity[]>
   */
  async findByIds(ids: string[]): Promise<CourseEntity[]> {
    const rows = await this.courseModel
      .find({ _id: { $in: ids } })
      .lean<CoursePersistenceLean[]>()
      .exec();
    return rows.map((r) => this.toEntity(r));
  }

  /**
   * Executes the find by major id operation.
   *
   * @param majorId - The majorId parameter
   * @returns Result of type Promise<CourseQueryItem[]>
   */
  async findByMajorId(majorId: string): Promise<CourseQueryItem[]> {
    const rows = await this.courseModel
      .find({ majorIds: majorId, deletedAt: null })
      .sort({ semester: 1, name: 1 })
      .populate('major')
      .populate('majors')
      .lean<CourseQueryWithPopulate[]>()
      .exec();
    return rows.map((r) => this.toQueryItem(r));
  }

  /**
   * Executes the create operation.
   *
   * @param data - The data parameter
   * @returns Result of type Promise<CourseEntity>
   */
  async create(data: Partial<CourseEntity>): Promise<CourseEntity> {
    const row = await this.courseModel.create(data);
    return this.toEntity(row.toObject() as CoursePersistenceLean);
  }

  /**
   * Executes the update operation.
   *
   * @param id - The id parameter
   * @param data - The data parameter
   * @returns Result of type Promise<CourseEntity | null>
   */
  async update(id: string, data: Partial<CourseEntity>): Promise<CourseEntity | null> {
    const row = await this.courseModel
      .findByIdAndUpdate(id, data, { new: true })
      .lean<CoursePersistenceLean>()
      .exec();
    return row ? this.toEntity(row) : null;
  }

  /**
   * Executes the delete operation.
   *
   * @param id - The id parameter
   * @returns Result of type Promise<boolean>
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.courseModel.findByIdAndUpdate(id, { deletedAt: new Date() }).exec();
    return result !== null;
  }

  /**
   * Maps a raw document to a CourseQueryItem for read models.
   *
   * @param doc - The raw document
   * @returns A CourseQueryItem instance
   */
  private toQueryItem(doc: CourseQueryWithPopulate): CourseQueryItem {
    return {
      id: doc._id.toString(),
      code: doc.code,
      name: doc.name,
      credits: doc.credits,
      semester: doc.semester,
      isCompulsory: doc.isCompulsory,
      majorIds: (doc.majorIds ?? []).map((id: any) => id.toString()),
      majorId: doc.majorIds && doc.majorIds.length > 0 ? doc.majorIds[0].toString() : '',
      major: doc.major
        ? {
            id: doc.major._id.toString(),
            code: doc.major.code,
            name: doc.major.name,
            description: doc.major.description,
            status: doc.major.status,
            createdAt: doc.major.createdAt,
            updatedAt: doc.major.updatedAt,
            deletedAt: doc.major.deletedAt ?? null,
          }
        : undefined,
      majors: doc.majors
        ? doc.majors.map((m) => ({
            id: m._id.toString(),
            code: m.code,
            name: m.name,
            description: m.description,
            status: m.status,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
            deletedAt: m.deletedAt ?? null,
          }))
        : undefined,
      prerequisiteCourseIds: (doc.prerequisiteCourseIds ?? []).map((id: Types.ObjectId | string) =>
        id.toString(),
      ),
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      deletedAt: doc.deletedAt ?? null,
    };
  }
}
