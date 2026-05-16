import { paginate, PaginatedResult, PaginationDto } from '@libs/contracts';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Career } from '../../../../domain/entities/career.entity';
import type {
  CareerQueryItem,
  ICareerRepository,
} from '../../../../domain/repositories/career.repository.interface';
import type { CareerDocument } from '../schemas/career.schema';

/** Repository interface/implementation for  career mongo data access. */
@Injectable()
export class CareerMongoRepository implements ICareerRepository {
  constructor(
    @InjectModel('Career')
    private readonly model: Model<CareerDocument>,
  ) {}

  /**
   * Executes the find all operation.
   *
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @param search - The search parameter
   * @returns Result of type Promise<PaginatedResult<CareerEntity>>
   */
  async findAll(
    page: number,
    limit: number,
    search?: string,
  ): Promise<PaginatedResult<CareerQueryItem>> {
    const query: Record<string, unknown> = { status: 'ACTIVE' };
    if (search) query.$text = { $search: search };

    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.model.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean().exec(),
      this.model.countDocuments(query).exec(),
    ]);

    const dto = new PaginationDto();
    dto.page = page;
    dto.limit = limit;
    return paginate(
      docs.map((d: any) => this.toQueryItem(d)),
      total,
      dto,
    );
  }

  /**
   * Executes the find by id operation.
   *
   * @param id - The id parameter
   * @returns Result of type Promise<CareerEntity | null>
   */
  async findById(id: string): Promise<Career | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.toEntity(doc) : null;
  }

  /**
   * Executes the create operation.
   *
   * @param data - The data parameter
   * @returns Result of type Promise<CareerEntity>
   */
  async create(data: { name: string; description: string }): Promise<Career> {
    const doc = await this.model.create(data);
    return this.toEntity(doc);
  }

  /**
   * Executes the update operation.
   *
   * @param id - The id parameter
   * @param data - The data parameter
   * @returns Result of type Promise<CareerEntity | null>
   */
  async update(
    id: string,
    data: Partial<{ name: string; description: string; status: string }>,
  ): Promise<Career | null> {
    const doc = await this.model.findByIdAndUpdate(id, data, { new: true }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  /**
   * Executes the delete operation.
   *
   * @param id - The id parameter
   */
  async delete(id: string): Promise<void> {
    await this.model.findByIdAndUpdate(id, { status: 'INACTIVE' }).exec();
  }

  /**
   * Executes the to entity operation.
   *
   * @param doc - The doc parameter
   * @returns Result of type CareerEntity
   */
  private toEntity(doc: CareerDocument): Career {
    return Career.reconstitute({
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  /**
   * Executes the to query item operation.
   *
   * @param doc - The doc parameter
   * @returns Result of type CareerQueryItem
   */
  private toQueryItem(doc: any): CareerQueryItem {
    return {
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      deletedAt: doc.deletedAt ?? null,
    };
  }
}
