import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { InferSchemaType, Types } from 'mongoose';
import { MajorEntity } from '../../../../domain/entities/major.entity';
import {
  IMajorRepository,
  MajorQueryItem,
} from '../../../../domain/repositories/major.repository.interface';
import { MajorDocument, MajorSchema, Major as MajorSchemaClass } from '../schemas/major.schema';

type MajorPersistenceLean = InferSchemaType<typeof MajorSchema> & {
  _id: Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
};

/** Repository interface/implementation for  major mongo data access. */
@Injectable()
export class MajorMongoRepository implements IMajorRepository {
  constructor(
    @InjectModel(MajorSchemaClass.name)
    private readonly majorModel: Model<MajorDocument>,
  ) {}

  /**
   * Maps a raw document to a MajorEntity.
   *
   * @param doc - The raw document
   * @returns A MajorEntity instance
   */
  private toEntity(doc: MajorPersistenceLean): MajorEntity {
    return MajorEntity.reconstitute({
      id: doc._id.toString(),
      code: doc.code,
      name: doc.name,
      description: doc.description,
      status: doc.status,
      deletedAt: doc.deletedAt ?? undefined,
    });
  }

  /**
   * Executes the find all operation.
   *
   * @returns Result of type Promise<MajorQueryItem[]>
   */
  async findAll(): Promise<MajorQueryItem[]> {
    const rows = await this.majorModel
      .find({ deletedAt: null })
      .sort({ name: 1 })
      .lean<MajorPersistenceLean[]>()
      .exec();
    return rows.map((r) => this.toQueryItem(r));
  }

  /**
   * Executes the find by id operation.
   *
   * @param id - The id parameter
   * @returns Result of type Promise<MajorEntity | null>
   */
  async findById(id: string): Promise<MajorEntity | null> {
    const row = await this.majorModel.findById(id).lean<MajorPersistenceLean>().exec();
    return row ? this.toEntity(row) : null;
  }

  /**
   * Executes the find by ids operation.
   *
   * @param ids - The ids parameter
   * @returns Result of type Promise<MajorEntity[]>
   */
  async findByIds(ids: string[]): Promise<MajorEntity[]> {
    const rows = await this.majorModel
      .find({ _id: { $in: ids } })
      .lean<MajorPersistenceLean[]>()
      .exec();
    return rows.map((r) => this.toEntity(r));
  }

  /**
   * Executes the create operation.
   *
   * @param data - The data parameter
   * @returns Result of type Promise<MajorEntity>
   */
  async create(data: Partial<MajorEntity>): Promise<MajorEntity> {
    const row = await this.majorModel.create(data);
    return this.toEntity(row.toObject() as MajorPersistenceLean);
  }

  /**
   * Executes the update operation.
   *
   * @param id - The id parameter
   * @param data - The data parameter
   * @returns Result of type Promise<MajorEntity | null>
   */
  async update(id: string, data: Partial<MajorEntity>): Promise<MajorEntity | null> {
    const row = await this.majorModel
      .findByIdAndUpdate(id, data, { new: true })
      .lean<MajorPersistenceLean>()
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
    const result = await this.majorModel.findByIdAndUpdate(id, { deletedAt: new Date() }).exec();
    return result !== null;
  }

  /**
   * Maps a raw document to a MajorQueryItem for read models.
   *
   * @param doc - The raw document
   * @returns A MajorQueryItem instance
   */
  private toQueryItem(doc: MajorPersistenceLean): MajorQueryItem {
    return {
      id: doc._id.toString(),
      code: doc.code,
      name: doc.name,
      description: doc.description,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      deletedAt: doc.deletedAt ?? null,
    };
  }
}
