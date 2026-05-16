import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';

/**
 * Generic Prisma health indicator.
 * Accepts any PrismaClient-like object with a $queryRaw method.
 * This keeps @libs/common free of @prisma/client dependency.
 */
@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  /**
   * Executes the ping check operation.
   *
   * @param key - The key parameter
   * @param prisma - The prisma parameter
   * @returns Result of type Promise<HealthIndicatorResult>
   */
  async pingCheck(
    key: string,
    prisma: { $queryRaw: (query: TemplateStringsArray) => Promise<unknown> },
  ): Promise<HealthIndicatorResult> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (err) {
      throw new HealthCheckError(
        `${key} ping failed`,
        this.getStatus(key, false, { message: (err as Error).message }),
      );
    }
  }
}
