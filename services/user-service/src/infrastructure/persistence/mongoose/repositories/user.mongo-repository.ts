import { paginate, PaginatedResult, PaginationDto } from '@libs/contracts';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserProfileAggregate } from '../../../../domain/entities/user-profile.entity';
import {
  IUserProfileRepository,
  UserFilter,
} from '../../../../domain/repositories/user-profile.repository.interface';
import { usernameSeedFromEmail } from '../../../../domain/value-objects/username.vo';
import { UserDocument } from '../schemas/user.schema';

/** Repository interface/implementation for  user mongo data access. */
@Injectable()
export class UserMongoRepository implements IUserProfileRepository {
  constructor(
    @InjectModel('User')
    private readonly model: Model<UserDocument>,
  ) {}

  /**
   * Executes the find by id operation.
   *
   * @param id - The id parameter
   * @returns Result of type Promise<UserProfileAggregate | null>
   */
  async findById(id: string): Promise<UserProfileAggregate | null> {
    const doc = await this.model
      .findOne({ userId: id })
      .populate('profile.careerId')
      .populate('profile.skillIds')
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByIds(ids: string[]): Promise<UserProfileAggregate[]> {
    const docs = await this.model
      .find({ userId: { $in: ids } })
      .populate('profile.careerId')
      .populate('profile.skillIds')
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async getBasicProfilesByIds(
    ids: string[],
  ): Promise<Array<{ userId: string; username: string; nickname: string; avatarUrl?: string }>> {
    const docs = await this.model
      .find(
        { userId: { $in: ids } },
        { userId: 1, username: 1, 'profile.nickname': 1, 'profile.avatarUrl': 1 },
      )
      .lean()
      .exec();

    return docs.map((doc) => ({
      userId: doc.userId,
      username: doc.username ?? usernameSeedFromEmail(doc.email),
      nickname: doc.profile?.nickname || 'User',
      avatarUrl: doc.profile?.avatarUrl,
    }));
  }

  /**
   * Executes the find by email operation.
   *
   * @param email - The email parameter
   * @returns Result of type Promise<UserProfileAggregate | null>
   */
  async findByEmail(email: string): Promise<UserProfileAggregate | null> {
    const doc = await this.model
      .findOne({ email: email.toLowerCase() })
      .populate('profile.careerId')
      .populate('profile.skillIds')
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Executes the find all operation.
   *
   * @param filter - The filter parameter
   * @param page - The page parameter
   * @param limit - The limit parameter
   * @returns Result of type Promise<PaginatedResult<UserProfileAggregate>>
   */
  async findAll(
    filter: UserFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<UserProfileAggregate>> {
    const query: Record<string, unknown> = {};
    if (filter.isActive !== undefined) query.isActive = filter.isActive;
    if (filter.search) {
      const search = escapeRegex(filter.search.trim());
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { 'profile.nickname': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.model
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('profile.careerId')
        .populate('profile.skillIds')
        .exec(),
      this.model.countDocuments(query).exec(),
    ]);

    const dto = new PaginationDto();
    dto.page = page;
    dto.limit = limit;
    return paginate(
      docs.map((d) => this.toDomain(d)),
      total,
      dto,
    );
  }

  /**
   * Executes the save operation.
   *
   * @param user - The user parameter
   */
  async save(user: UserProfileAggregate): Promise<void> {
    await this.model.create(this.toDocument(user));
  }

  /**
   * Executes the update operation.
   *
   * @param user - The user parameter
   */
  async update(user: UserProfileAggregate): Promise<void> {
    await this.model
      .findOneAndUpdate({ userId: user.userId }, this.toDocument(user), { new: true })
      .exec();
  }

  /**
   * Executes the delete operation.
   *
   * @param id - The id parameter
   */
  async delete(id: string): Promise<void> {
    await this.model.findOneAndDelete({ userId: id }).exec();
  }

  /**
   * Executes the exists by id operation.
   *
   * @param id - The id parameter
   * @returns Result of type Promise<boolean>
   */
  async existsById(id: string): Promise<boolean> {
    return !!(await this.model.exists({ userId: id }));
  }

  // ── Mappers ───────────────────────────────────────────────────────
  /**
   * Executes the to domain operation.
   *
   * @param doc - The doc parameter
   * @returns Result of type UserProfileAggregate
   */
  private toDomain(doc: UserDocument): UserProfileAggregate {
    const careerObj = doc.profile.careerId as any;
    const skillsArr = doc.profile.skillIds as any[] | undefined;

    return UserProfileAggregate.reconstitute({
      id: doc._id.toString(),
      userId: doc.userId,
      email: doc.email,
      username: doc.username ?? usernameSeedFromEmail(doc.email),
      profile: {
        nickname: doc.profile.nickname,
        phone: doc.profile.phone,
        bio: doc.profile.bio,
        avatarUrl: doc.profile.avatarUrl,
        dateOfBirth: doc.profile.dateOfBirth,
        majorId: doc.profile.majorId?.toString(),
        courseId: doc.profile.courseId?.toString(),
        semester: doc.profile.semester,
        careerId: careerObj?._id?.toString() || careerObj?.toString(),
        skillIds: skillsArr?.map((id: any) => id?._id?.toString() || id?.toString()),
        career: careerObj?.name
          ? { id: careerObj._id.toString(), name: careerObj.name }
          : undefined,
        skills:
          skillsArr && skillsArr.length > 0 && skillsArr[0]?.name
            ? skillsArr.map((s) => ({ id: s._id.toString(), name: s.name }))
            : undefined,
      },
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  /**
   * Executes the to document operation.
   *
   * @param user - The user parameter
   * @returns Result of type Record<string, unknown>
   */
  private toDocument(user: UserProfileAggregate): Record<string, unknown> {
    const profileDoc = { ...user.profile };
    delete profileDoc.career;
    delete profileDoc.skills;

    const data: Record<string, unknown> = {
      userId: user.userId,
      email: user.email,
      username: user.username,
      profile: profileDoc,
      isActive: user.isActive,
    };
    if (user.id) data._id = user.id;
    return data;
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
