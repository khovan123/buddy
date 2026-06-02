import {
  AppLogger,
  Bulkhead,
  CircuitBreaker,
  CORRELATION_ID_HEADER,
  ensureCorrelationId,
  getCorrelationId,
  retry,
} from '@libs/common';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ServiceName, ServiceRegistryService } from '../config/service-registry.service';

/** Interface representing data constraints for  proxy options. */
export interface ProxyOptions {
  service: ServiceName;
  /** Optional key for isolating circuit breaker/bulkhead state within a service. */
  resilienceKey?: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  rawBody?: string | Buffer;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Skip retry even for GET requests. Default: false */
  skipRetry?: boolean;
}

// ── Resilience defaults ────────────────────────────────────────────────────────
const DEFAULT_CIRCUIT_BREAKER = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxAttempts: 2,
};
const DEFAULT_BULKHEAD = { maxConcurrent: 20, maxQueue: 50 };

/** Per-service bulkhead overrides (upload handles large files → lower concurrency) */
const BULKHEAD_OVERRIDES: Record<string, { maxConcurrent: number; maxQueue: number }> = {
  upload: { maxConcurrent: 10, maxQueue: 30 },
  'recommendation-rag': { maxConcurrent: 4, maxQueue: 8 },
  'recommendation-rag-health': { maxConcurrent: 10, maxQueue: 20 },
  'recommendation-rag-index': { maxConcurrent: 1, maxQueue: 2 },
};

/** Service handling business logic for  http proxy. */
@Injectable()
export class HttpProxyService {
  private readonly logger = new AppLogger(HttpProxyService.name);

  /** Per-service or per-route-group circuit breakers */
  private readonly breakers = new Map<string, CircuitBreaker>();
  /** Per-service or per-route-group bulkheads */
  private readonly bulkheads = new Map<string, Bulkhead>();

  constructor(
    private readonly registry: ServiceRegistryService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Forward a request to an upstream service.
   * Layered resilience: Bulkhead → Circuit Breaker → Retry → fetch
   *
   * @param reply – Optional. When provided, Set-Cookie headers from the
   *                upstream response are transparently forwarded to the client.
   */
  async forward(
    req: FastifyRequest,
    options: ProxyOptions,
    reply?: FastifyReply,
  ): Promise<unknown> {
    const resilienceKey = options.resilienceKey ?? options.service;
    const breaker = this.getCircuitBreaker(resilienceKey);
    const bulkhead = this.getBulkhead(resilienceKey);

    // Layer 1: Bulkhead (concurrency isolation)
    return bulkhead.execute(() =>
      // Layer 2: Circuit Breaker (fail-fast when service is down)
      breaker.execute(() =>
        // Layer 3: Retry (for idempotent GET requests only)
        this.executeWithRetry(req, options, reply),
      ),
    );
  }

  /**
   * Execute the actual HTTP call, optionally wrapping in retry for GET requests.
   */
  private async executeWithRetry(
    req: FastifyRequest,
    options: ProxyOptions,
    reply?: FastifyReply,
  ): Promise<unknown> {
    const isIdempotent = options.method === 'GET' && !options.skipRetry;

    if (isIdempotent) {
      return retry(() => this.doFetch(req, options, reply), {
        maxAttempts: 2,
        delayMs: 500,
        backoffFactor: 2,
      });
    }

    return this.doFetch(req, options, reply);
  }

  /**
   * The actual fetch call — extracted from the original forward() method.
   */
  private async doFetch(
    req: FastifyRequest,
    options: ProxyOptions,
    reply?: FastifyReply,
  ): Promise<unknown> {
    const baseUrl = this.registry.getUrl(options.service);
    const queryString = options.query ? '?' + new URLSearchParams(options.query).toString() : '';
    const url = `${baseUrl}${options.path}${queryString}`;
    const correlationId = ensureCorrelationId(
      getCorrelationId(),
      req.headers[CORRELATION_ID_HEADER],
    );

    const optionHeaders = options.headers ?? {};
    const requestedContentType =
      optionHeaders['content-type'] ?? optionHeaders['Content-Type'] ?? 'application/json';
    const forwardedHeaders = Object.fromEntries(
      Object.entries(optionHeaders).filter(([key]) => key.toLowerCase() !== 'content-type'),
    );

    const headers: Record<string, string> = {
      [CORRELATION_ID_HEADER]: correlationId,
      'x-forwarded-for': req.ip,
      'x-forwarded-host': req.hostname,
      ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
      ...(req.headers.cookie ? { cookie: req.headers.cookie } : {}),
      ...forwardedHeaders,
    };

    // Only set Content-Type and body for non-GET methods with a body
    const rawBody =
      typeof options.rawBody === 'string' ? options.rawBody : options.rawBody?.toString('utf8');
    const hasRawBody = rawBody !== undefined && options.method !== 'GET';
    const hasJsonBody = options.body !== undefined && options.method !== 'GET';
    const hasBody = hasRawBody || hasJsonBody;
    if (hasBody) {
      headers['Content-Type'] = requestedContentType;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 100_000);

    try {
      this.logger.debug(`Proxying ${options.method} → ${url}`);

      const response = await fetch(url, {
        method: options.method,
        headers: headers,
        body: hasRawBody ? rawBody : hasJsonBody ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
        keepalive: true,
      });

      clearTimeout(timeout);

      // Forward Set-Cookie headers from upstream → client
      if (reply) {
        const setCookies = response.headers.getSetCookie?.() ?? [];
        for (const cookie of setCookies) {
          reply.header('set-cookie', cookie);
        }
      }

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new HttpException((data as any)?.message || 'Upstream error', response.status);
      }

      return data;
    } catch (err) {
      clearTimeout(timeout);

      if (err instanceof HttpException) throw err;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((err as any)?.name === 'AbortError') {
        this.logger.error(`Timeout proxying to ${options.service}: ${url}`);
        throw new HttpException(`Service ${options.service} timeout`, HttpStatus.GATEWAY_TIMEOUT);
      }

      this.logger.error(
        `Error proxying to ${options.service}: ${url}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw new HttpException(`Service ${options.service} unavailable`, HttpStatus.BAD_GATEWAY);
    }
  }

  // ── Lazy-initialized resilience primitives ─────────────────────────────────

  private getCircuitBreaker(key: string): CircuitBreaker {
    let breaker = this.breakers.get(key);
    if (!breaker) {
      const envKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      breaker = new CircuitBreaker({
        name: `cb-${key}`,
        failureThreshold:
          this.config.get<number>(`CB_FAILURE_THRESHOLD_${envKey}`) ??
          DEFAULT_CIRCUIT_BREAKER.failureThreshold,
        resetTimeoutMs:
          this.config.get<number>(`CB_RESET_TIMEOUT_${envKey}`) ??
          DEFAULT_CIRCUIT_BREAKER.resetTimeoutMs,
        halfOpenMaxAttempts: DEFAULT_CIRCUIT_BREAKER.halfOpenMaxAttempts,
      });
      this.breakers.set(key, breaker);
    }
    return breaker;
  }

  private getBulkhead(key: string): Bulkhead {
    let bulkhead = this.bulkheads.get(key);
    if (!bulkhead) {
      const overrides = BULKHEAD_OVERRIDES[key];
      bulkhead = new Bulkhead({
        name: `bh-${key}`,
        maxConcurrent: overrides?.maxConcurrent ?? DEFAULT_BULKHEAD.maxConcurrent,
        maxQueue: overrides?.maxQueue ?? DEFAULT_BULKHEAD.maxQueue,
      });
      this.bulkheads.set(key, bulkhead);
    }
    return bulkhead;
  }
}
