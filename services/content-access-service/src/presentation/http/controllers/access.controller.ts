import { getCorrelationId, JwtAuthGuard } from '@libs/common';
import { successResponse } from '@libs/contracts';
import { Controller, Get, HttpCode, HttpStatus, Req, UseGuards, Version } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { FastifyRequest } from 'fastify';
import { ListUserAccessQuery } from '../../../application/queries/list-user-access.query';

@Controller({ path: 'access', version: '1' })
@UseGuards(JwtAuthGuard)
export class AccessController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('me')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async listMyAccess(@Req() req: FastifyRequest & { user: { sub: string } }) {
    const result = await this.queryBus.execute(new ListUserAccessQuery(req.user.sub));
    return successResponse(result, 'Get user content access successful', getCorrelationId());
  }
}
