import { AppLogger, RETRY_OPTIONS } from '@libs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

/** Service handling business logic for  outbox cleanup. */
@Injectable()
export class OutboxCleanupService {
  private readonly logger = new AppLogger(OutboxCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Executes the cleanup processed outbox operation.
   *
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupProcessedOutbox(): Promise<void> {
    const ttlDays = this.getCleanupTtlDays();
    const cutoffDate = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000);

    const result = await this.prisma.client.outbox.deleteMany({
      where: {
        processedAt: {
          lt: cutoffDate,
        },
        OR: [
          {
            status: 'PROCESSED',
          },
          {
            status: 'FAILED',
            retryCount: {
              gte: RETRY_OPTIONS.MAX_RETRIES,
            },
          },
        ],
      },
    });

    this.logger.log(
      `Outbox cleanup completed: deleted ${result.count} rows older than ${ttlDays} days`,
    );
  }

  /**
   * Executes the get cleanup ttl days operation.
   *
   * @returns Result of type number
   */
  private getCleanupTtlDays(): number {
    const raw = this.configService.get<string>('CLEANUP_TTL_DAYS');
    const parsed = Number(raw);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 7;
    }

    return Math.floor(parsed);
  }
}
