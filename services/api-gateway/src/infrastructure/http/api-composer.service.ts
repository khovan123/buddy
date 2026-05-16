import { AppLogger } from '@libs/common';
import { Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { HttpProxyService, ProxyOptions } from './http-proxy.service';

export interface CompositionRequest {
  /** Key name in the aggregated result. */
  key: string;
  /** Proxy options for this downstream call. */
  options: Omit<ProxyOptions, 'body'>;
  /** If true, a failure in this call won't fail the entire composition. Default: false */
  optional?: boolean;
}

export interface CompositionResult {
  [key: string]: unknown;
}

/**
 * API Composition service.
 *
 * Aggregates data from multiple downstream services into a single response.
 * Uses `Promise.allSettled()` for partial failure tolerance.
 *
 * Usage in a controller:
 *   const result = await this.composer.compose(req, [
 *     { key: 'tutorial', options: { service: 'content', path: '/v1/tutorials/123', method: 'GET' } },
 *     { key: 'uploadStatus', options: { service: 'upload', path: '/v1/uploads/status/123', method: 'GET' }, optional: true },
 *   ]);
 */
@Injectable()
export class ApiComposerService {
  private readonly logger = new AppLogger(ApiComposerService.name);

  constructor(private readonly proxy: HttpProxyService) {}

  /**
   * Execute multiple downstream calls in parallel and merge results.
   */
  async compose(req: FastifyRequest, requests: CompositionRequest[]): Promise<CompositionResult> {
    const results = await Promise.allSettled(
      requests.map((r) => this.proxy.forward(req, { ...r.options } as ProxyOptions)),
    );

    const composed: CompositionResult = {};

    for (let i = 0; i < requests.length; i++) {
      const { key, optional } = requests[i];
      const result = results[i];

      if (result.status === 'fulfilled') {
        composed[key] = result.value;
      } else {
        if (optional) {
          this.logger.warn(`Optional composition call '${key}' failed: ${result.reason}`);
          composed[key] = null;
        } else {
          this.logger.error(`Required composition call '${key}' failed`, String(result.reason));
          throw result.reason;
        }
      }
    }

    return composed;
  }
}
