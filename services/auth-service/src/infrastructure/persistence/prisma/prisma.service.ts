import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { withAccelerate } from '@prisma/extension-accelerate';
import { Pool } from 'pg';
import { PrismaClient } from './generated/client';

function isAccelerateUrl(url: string): boolean {
  return url.startsWith('prisma://') || url.startsWith('prisma+postgres://');
}

function createPrismaClient(databaseUrl: string, isDev: boolean) {
  const logConfig = isDev
    ? [
        { emit: 'stdout' as const, level: 'error' as const },
        { emit: 'stdout' as const, level: 'warn' as const },
      ]
    : [{ emit: 'stdout' as const, level: 'error' as const }];

  // Production: connect through Prisma Accelerate
  if (isAccelerateUrl(databaseUrl)) {
    return new PrismaClient({
      accelerateUrl: databaseUrl,
      log: logConfig,
    }).$extends(withAccelerate());
  }

  // Dev: connect directly via pg driver adapter
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: logConfig,
  }).$extends(withAccelerate());
}

export type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;
export type TransactionClient = Parameters<Parameters<ExtendedPrismaClient['$transaction']>[0]>[0];

/** Service handling business logic for  prisma. */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public readonly client: ExtendedPrismaClient;

  constructor(private readonly config: ConfigService) {
    this.client = createPrismaClient(
      config.get<string>('DATABASE_URL')!,
      process.env.NODE_ENV === 'development',
    );
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
    this.logger.log(
      isAccelerateUrl(this.config.get<string>('DATABASE_URL')!)
        ? 'Prisma connected via Accelerate'
        : 'Prisma connected via direct pg adapter',
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}
