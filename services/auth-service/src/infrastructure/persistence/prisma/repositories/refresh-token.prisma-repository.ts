import { Injectable } from '@nestjs/common';
import {
  IRefreshTokenRepository,
  RefreshTokenData,
} from '../../../../domain/repositories/refresh-token.repository.interface';
import { PrismaService } from '../prisma.service';

/** Repository interface/implementation for  refresh token prisma data access. */
@Injectable()
export class RefreshTokenPrismaRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executes the save operation.
   *
   * @param token - The token parameter
   */
  async save(token: RefreshTokenData): Promise<void> {
    await this.prisma.client.refreshToken.create({
      data: {
        id: token.id,
        userId: token.userId,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
        ipAddress: token.ipAddress ?? null,
        userAgent: token.userAgent ?? null,
      },
    });
  }

  /**
   * Executes the find by hash operation.
   *
   * @param tokenHash - The tokenHash parameter
   * @returns Result of type Promise<RefreshTokenData | null>
   */
  async findByHash(tokenHash: string): Promise<RefreshTokenData | null> {
    const row = await this.prisma.client.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      ipAddress: row.ipAddress ?? undefined,
      userAgent: row.userAgent ?? undefined,
    };
  }

  /**
   * Executes the delete by user id operation.
   *
   * @param userId - The userId parameter
   */
  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.client.refreshToken.deleteMany({ where: { userId } });
  }

  /**
   * Executes the delete by hash operation.
   *
   * @param tokenHash - The tokenHash parameter
   */
  async deleteByHash(tokenHash: string): Promise<void> {
    // Prisma 7: deleteMany safer than delete for unique fields in concurrent scenarios
    await this.prisma.client.refreshToken.deleteMany({ where: { tokenHash } });
  }

  /**
   * Executes the delete expired operation.
   *
   */
  async deleteExpired(): Promise<void> {
    await this.prisma.client.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
