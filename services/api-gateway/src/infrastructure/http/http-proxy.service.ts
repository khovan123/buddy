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
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
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
const BULKHEAD_OVERRIDES: Partial<
  Record<ServiceName, { maxConcurrent: number; maxQueue: number }>
> = {
  upload: { maxConcurrent: 10, maxQueue: 30 },
};

/** Service handling business logic for  http proxy. */
@Injectable()
export class HttpProxyService {
  private readonly logger = new AppLogger(HttpProxyService.name);

  /** Per-service circuit breakers */
  private readonly breakers = new Map<ServiceName, CircuitBreaker>();
  /** Per-service bulkheads */
  private readonly bulkheads = new Map<ServiceName, Bulkhead>();

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
    const breaker = this.getCircuitBreaker(options.service);
    const bulkhead = this.getBulkhead(options.service);

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

    const headers: Record<string, string> = {
      [CORRELATION_ID_HEADER]: correlationId,
      'x-forwarded-for': req.ip,
      'x-forwarded-host': req.hostname,
      ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
      ...(req.headers.cookie ? { cookie: req.headers.cookie } : {}),
      ...options.headers,
    };

    // Only set Content-Type and body for non-GET methods with a body
    const hasBody = options.body && options.method !== 'GET';
    if (hasBody) {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 100_000);

    try {
      this.logger.debug(`Proxying ${options.method} → ${url}`);

      const response = await fetch(url, {
        method: options.method,
        headers: headers,
        body: hasBody ? JSON.stringify(options.body) : undefined,
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

  private getCircuitBreaker(service: ServiceName): CircuitBreaker {
    let breaker = this.breakers.get(service);
    if (!breaker) {
      breaker = new CircuitBreaker({
        name: `cb-${service}`,
        failureThreshold:
          this.config.get<number>(`CB_FAILURE_THRESHOLD_${service.toUpperCase()}`) ??
          DEFAULT_CIRCUIT_BREAKER.failureThreshold,
        resetTimeoutMs:
          this.config.get<number>(`CB_RESET_TIMEOUT_${service.toUpperCase()}`) ??
          DEFAULT_CIRCUIT_BREAKER.resetTimeoutMs,
        halfOpenMaxAttempts: DEFAULT_CIRCUIT_BREAKER.halfOpenMaxAttempts,
      });
      this.breakers.set(service, breaker);
    }
    return breaker;
  }

  private getBulkhead(service: ServiceName): Bulkhead {
    let bulkhead = this.bulkheads.get(service);
    if (!bulkhead) {
      const overrides = BULKHEAD_OVERRIDES[service];
      bulkhead = new Bulkhead({
        name: `bh-${service}`,
        maxConcurrent: overrides?.maxConcurrent ?? DEFAULT_BULKHEAD.maxConcurrent,
        maxQueue: overrides?.maxQueue ?? DEFAULT_BULKHEAD.maxQueue,
      });
      this.bulkheads.set(service, bulkhead);
    }
    return bulkhead;
  }
}
