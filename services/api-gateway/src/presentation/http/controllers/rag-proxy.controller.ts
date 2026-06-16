import {
  JwtAuthGuard,
  PoliciesGuard,
  Public,
  RequirePolicy,
  SearchResultLimitPolicy,
  SubscriptionRequiredPolicy,
} from '@libs/common';
import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { HttpProxyService } from '../../../infrastructure/http/http-proxy.service';

/** Proxy controller forwarding RAG requests to the dedicated rag-service. */
@Controller({ path: 'recommendations/rag', version: '1' })
export class RagProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

  private getAuthUserId(req: FastifyRequest): string | undefined {
    return (req as FastifyRequest & { user?: { sub?: string } }).user?.sub;
  }

  private withAuthUserId(body: unknown, userId: string | undefined): unknown {
    if (!userId || !body || typeof body !== 'object' || Array.isArray(body)) {
      return body;
    }

    return { ...(body as Record<string, unknown>), userId };
  }

  @Post('ask')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @RequirePolicy(SubscriptionRequiredPolicy, SearchResultLimitPolicy)
  ask(@Body() body: unknown, @Req() req: FastifyRequest) {
    const userId = this.getAuthUserId(req);
    return this.proxy.forward(req, {
      service: 'rag',
      resilienceKey: 'recommendation-rag',
      path: '/v1/rag/ask',
      method: 'POST',
      body: this.withAuthUserId(body, userId),
      timeoutMs: 100_000,
    });
  }

  @Post('retrieve')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @RequirePolicy(SubscriptionRequiredPolicy, SearchResultLimitPolicy)
  retrieve(@Body() body: unknown, @Req() req: FastifyRequest) {
    const userId = this.getAuthUserId(req);
    return this.proxy.forward(req, {
      service: 'rag',
      resilienceKey: 'recommendation-rag',
      path: '/v1/rag/retrieve',
      method: 'POST',
      body: this.withAuthUserId(body, userId),
      timeoutMs: 100_000,
    });
  }

  @Post('fit-draft')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @RequirePolicy(SubscriptionRequiredPolicy, SearchResultLimitPolicy)
  generateFitDraft(@Body() body: unknown, @Req() req: FastifyRequest) {
    const userId = this.getAuthUserId(req);
    return this.proxy.forward(req, {
      service: 'rag',
      resilienceKey: 'recommendation-rag',
      path: '/v1/rag/fit-draft',
      method: 'POST',
      body: this.withAuthUserId(body, userId),
      timeoutMs: 100_000,
    });
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  history(@Req() req: FastifyRequest) {
    const userId = this.getAuthUserId(req);
    return this.proxy.forward(req, {
      service: 'rag',
      resilienceKey: 'recommendation-rag',
      path: '/v1/rag/history',
      method: 'GET',
      query: userId ? { userId } : {},
      timeoutMs: 10_000,
      skipRetry: true,
    });
  }

  @Delete('history')
  @UseGuards(JwtAuthGuard)
  clearHistory(@Req() req: FastifyRequest) {
    const userId = this.getAuthUserId(req);
    return this.proxy.forward(req, {
      service: 'rag',
      resilienceKey: 'recommendation-rag',
      path: '/v1/rag/history',
      method: 'DELETE',
      query: userId ? { userId } : {},
      timeoutMs: 10_000,
      skipRetry: true,
    });
  }

  @Post('index')
  @UseGuards(JwtAuthGuard)
  index(@Body() body: unknown, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'rag',
      resilienceKey: 'recommendation-rag-index',
      path: '/v1/rag/index',
      method: 'POST',
      body,
      timeoutMs: 300_000,
    });
  }

  @Post('catalog-backfill')
  @UseGuards(JwtAuthGuard)
  catalogBackfill(@Body() body: unknown, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'content',
      resilienceKey: 'recommendation-catalog-backfill',
      path: '/v1/content-meta/recommendation-sync/backfill',
      method: 'POST',
      body,
      timeoutMs: 300_000,
    });
  }

  @Get('health')
  @Public()
  health(@Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'rag',
      resilienceKey: 'recommendation-rag-health',
      path: '/v1/health/liveness',
      method: 'GET',
      timeoutMs: 5_000,
      skipRetry: true,
    });
  }

  @Get('stats')
  @Public()
  stats(@Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'rag',
      resilienceKey: 'recommendation-rag-stats',
      path: '/v1/rag/stats',
      method: 'GET',
      timeoutMs: 10_000,
      skipRetry: true,
    });
  }
}
