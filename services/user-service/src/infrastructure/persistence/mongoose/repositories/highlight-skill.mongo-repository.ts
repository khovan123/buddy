import { paginate, PaginatedResult, PaginationDto } from '@libs/contracts';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  HighlightSkill,
  HighlightSkillStatus,
} from '../../../../domain/entities/highlight-skill.entity';
import type {
  HighlightSkillQueryItem,
  IHighlightSkillRepository,
} from '../../../../domain/repositories/highlight-skill.repository.interface';
import type { HighlightSkillDocument } from '../schemas/highlight-skill.schema';

/** Repository interface/implementation for  highlight skill mongo data access. */
@Injectable()
export class HighlightSkillMongoRepository implements IHighlightSkillRepository {
  constructor(
    @InjectModel('HighlightSkill')
    private readonly model: Model<HighlightSkillDocument>,
  ) {}

  /**
   * Executes the find all operation.
   *
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @param careerId - The careerId parameter
   * @returns Result of type Promise<PaginatedResult<HighlightSkillEntity>>
   */
  async findAll(
    page: number,
    limit: number,
    careerId?: string,
  ): Promise<PaginatedResult<HighlightSkillQueryItem>> {
    const query: Record<string, unknown> = { status: HighlightSkillStatus.ACTIVE };
    if (careerId) query.careerId = careerId;

    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.model
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ name: 1 })
        .populate('careerId')
        .lean()
        .exec(),
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
   * @returns Result of type Promise<HighlightSkillEntity | null>
   */
  async findById(id: string): Promise<HighlightSkill | null> {
    const doc = await this.model.findById(id).populate('careerId').exec();
    return doc ? this.toEntity(doc) : null;
  }

  /**
   * Executes the find by career id operation.
   *
   * @param careerId - The careerId parameter
   * @returns Result of type Promise<HighlightSkillEntity[]>
   */
  async findByCareerId(careerId: string): Promise<HighlightSkill[]> {
    const docs = await this.model
      .find({ careerId: careerId, status: HighlightSkillStatus.ACTIVE })
      .sort({ name: 1 })
      .populate('careerId')
      .exec();
    return docs.map((d) => this.toEntity(d));
  }

  /**
   * Executes the create operation.
   *
   * @param data - The data parameter
   * @returns Result of type Promise<HighlightSkillEntity>
   */
  async create(data: { name: string; careerId: string }): Promise<HighlightSkill> {
    const doc = await this.model.create({
      name: data.name,
      careerId: data.careerId,
    });
    return this.toEntity(doc);
  }

  /**
   * Executes the update operation.
   *
   * @param id - The id parameter
   * @param data - The data parameter
   * @returns Result of type Promise<HighlightSkillEntity | null>
   */
  async update(
    id: string,
    data: Partial<{ name: string; careerId: string; status: string }>,
  ): Promise<HighlightSkill | null> {
    const updateData: Record<string, unknown> = {};
    if (data.name) updateData.name = data.name;
    if (data.careerId) updateData.careerId = data.careerId;
    if (data.status) updateData.status = data.status;

    const doc = await this.model.findByIdAndUpdate(id, updateData, { new: true }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  /**
   * Executes the delete operation.
   *
   * @param id - The id parameter
   */
  async delete(id: string): Promise<void> {
    await this.model.findByIdAndUpdate(id, { status: HighlightSkillStatus.INACTIVE }).exec();
  }

  /**
   * Executes the to entity operation.
   *
   * @param doc - The doc parameter
   * @returns Result of type HighlightSkillEntity
   */
  private toEntity(doc: HighlightSkillDocument): HighlightSkill {
    const careerObj = doc.careerId as any;
    return HighlightSkill.reconstitute({
      id: doc._id.toString(),
      name: doc.name,
      careerId: careerObj?._id?.toString() || careerObj?.toString(),
      career: careerObj?.name ? { id: careerObj._id.toString(), name: careerObj.name } : undefined,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  /**
   * Executes the to query item operation.
   *
   * @param doc - The doc parameter
   * @returns Result of type HighlightSkillQueryItem
   */
  private toQueryItem(doc: any): HighlightSkillQueryItem {
    const careerObj = doc.careerId as any;
    return {
      id: doc._id.toString(),
      name: doc.name,
      careerId: careerObj?._id?.toString() || careerObj?.toString(),
      career: careerObj?.name ? { id: careerObj._id.toString(), name: careerObj.name } : undefined,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      deletedAt: doc.deletedAt ?? null,
    };
  }
}
