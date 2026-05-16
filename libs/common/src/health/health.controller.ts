import { Controller, Get, Inject, Optional } from '@nestjs/common';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../guards/jwt-auth.guard';
import { PrismaHealthIndicator } from './prisma-health.indicator';

/**
 * Shared HealthController — works with or without Prisma.
 * Services that use Prisma: provide PRISMA_CLIENT token in their module.
 * Services that don't (e.g. api-gateway): db check is skipped automatically.
 */
export const PRISMA_CLIENT = Symbol('PRISMA_CLIENT');

/** Controller handling incoming requests for Health. */
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    @Inject(PrismaHealthIndicator)
    @Optional()
    private readonly prismaIndicator?: PrismaHealthIndicator,
    @Inject(PRISMA_CLIENT)
    @Optional()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly prismaClient?: any,
  ) {}

  /**
   * Executes the check operation.
   *
   */
  @Get()
  @Public()
  @HealthCheck()
  check() {
    const checks = [
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      // () => this.disk.checkStorage('disk', { thresholdPercent: 0.9, path: '/' }),
    ];

    // Only add DB check if a Prisma client and indicator are provided
    if (this.prismaClient && this.prismaIndicator) {
      const pCli = this.prismaClient;
      checks.unshift(() => this.prismaIndicator!.pingCheck('database', pCli));
    }

    return this.health.check(checks);
  }

  /**
   * Executes the liveness operation.
   *
   */
  @Get('liveness')
  @Public()
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Executes the readiness operation.
   *
   */
  @Get('readiness')
  @Public()
  @HealthCheck()
  readiness() {
    const checks =
      this.prismaClient && this.prismaIndicator
        ? [() => this.prismaIndicator!.pingCheck('database', this.prismaClient!)]
        : [() => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024)];

    return this.health.check(checks);
  }
}
