import { JwtAuthGuard, getCorrelationId } from '@libs/common';
import { successResponse } from '@libs/contracts';
import { Controller, ForbiddenException, Get, Req, UseGuards, Version } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ApiComposerService } from '../../../infrastructure/http/api-composer.service';

@Controller({ path: 'admin/overview', version: '1' })
@UseGuards(JwtAuthGuard)
export class AdminOverviewController {
  constructor(private readonly composer: ApiComposerService) {}

  @Get()
  @Version('1')
  async getOverview(@Req() req: FastifyRequest & { user: { roles?: string[] } }) {
    if (!req.user?.roles?.some((role) => role.trim().toUpperCase() === 'ADMIN')) {
      throw new ForbiddenException('Admin role required');
    }

    const result = await this.composer.compose(req, [
      {
        key: 'users',
        options: { service: 'auth', path: '/v1/auth/admin/overview/users', method: 'GET' },
      },
      {
        key: 'posts',
        options: {
          service: 'content',
          path: '/v1/content-settings/admin/overview/posts',
          method: 'GET',
        },
      },
      {
        key: 'billing',
        options: { service: 'billing', path: '/v1/billing/admin/overview', method: 'GET' },
      },
    ]);

    const data = Object.fromEntries(
      Object.entries(result).map(([key, value]) => [
        key,
        value && typeof value === 'object' && 'data' in value
          ? (value as { data: unknown }).data
          : value,
      ]),
    );
    return successResponse(data, 'Admin overview retrieved', getCorrelationId());
  }
}
