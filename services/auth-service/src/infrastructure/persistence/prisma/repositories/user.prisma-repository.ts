import { Injectable } from '@nestjs/common';
import { User, UserRole } from '../../../../domain/entities/user.entity';
import { IUserRepository } from '../../../../domain/repositories/user.repository.interface';
import { Email } from '../../../../domain/value-objects/email.vo';
import { Password } from '../../../../domain/value-objects/password.vo';
import { PrismaService } from '../prisma.service';

import type { User as PrismaUser, UserStatus } from '../generated/browser';

/** Repository interface/implementation for  user prisma data access. */
@Injectable()
export class UserPrismaRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executes the find by id operation.
   *
   * @param id - The id parameter
   * @returns Result of type Promise<User | null>
   */
  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.client.user.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  /**
   * Executes the find by email operation.
   *
   * @param email - The email parameter
   * @returns Result of type Promise<User | null>
   */
  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.client.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    return row ? this.toDomain(row) : null;
  }

  /**
   * Executes the save operation.
   *
   * @param user - The user parameter
   */
  async save(user: User): Promise<void> {
    await this.prisma.client.user.create({ data: this.toRow(user) });
  }

  /**
   * Executes the update operation.
   *
   * @param user - The user parameter
   */
  async update(user: User): Promise<void> {
    const { id, ...data } = this.toRow(user);
    await this.prisma.client.user.update({ where: { id }, data });
  }

  /**
   * Executes the delete operation.
   *
   * @param id - The id parameter
   */
  async delete(id: string): Promise<void> {
    await this.prisma.client.user.delete({ where: { id } });
  }

  /**
   * Executes the exists by email operation.
   *
   * @param email - The email parameter
   * @returns Result of type Promise<boolean>
   */
  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.client.user.count({
      where: { email: email.toLowerCase() },
    });
    return count > 0;
  }

  // ── Mappers ───────────────────────────────────────────────────────
  /**
   * Executes the to domain operation.
   *
   * @param row - The row parameter
   * @returns Result of type User
   */
  private toDomain(row: PrismaUser): User {
    return User.reconstitute({
      id: row.id,
      email: Email.create(row.email),
      password: Password.fromHashed(row.passwordHash),
      nickname: row.nickname,
      roles: row.roles as UserRole[],
      subscriptionPlan: row.subscriptionPlan,
      // Prisma 7 enum values are lowercase strings matching schema definition
      status: row.status as UserStatus,
      emailVerified: row.emailVerified,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastLoginAt: row.lastLoginAt ?? undefined,
    });
  }

  /**
   * Executes the to row operation.
   *
   * @param user - The user parameter
   * @returns Result of type Omit<PrismaUser, 'refreshTokens'> & { id: string }
   */
  private toRow(user: User): Omit<PrismaUser, 'refreshTokens'> & { id: string } {
    return {
      id: user.id,
      email: user.email.value,
      passwordHash: user.password.hashed,
      nickname: user.nickname,
      roles: user.roles,
      subscriptionPlan: user.subscriptionPlan,
      // domain status ('active') matches Prisma 7 enum key directly
      status: user.status as UserStatus,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // ── Subscription ────────────────────────────────────────────────────

  async updateSubscriptionPlan(userId: string, plan: string): Promise<void> {
    await this.prisma.client.user.update({
      where: { id: userId },
      data: { subscriptionPlan: plan },
    });
  }

  /** Delete all refresh tokens → user must re-login → gets new JWT with updated plan. */
  async invalidateUserTokens(userId: string): Promise<void> {
    await this.prisma.client.refreshToken.deleteMany({
      where: { userId },
    });
  }
}
