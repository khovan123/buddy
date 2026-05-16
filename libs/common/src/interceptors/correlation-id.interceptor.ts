import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export const asyncLocalStorage = new AsyncLocalStorage<Map<string, string>>();

export const CORRELATION_ID_HEADER = 'x-correlation-id';

function normalizeCorrelationId(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return normalizeCorrelationId(value[0]);
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function ensureCorrelationId(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    const resolved = normalizeCorrelationId(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return randomUUID();
}

export function runWithCorrelationId<T>(correlationId: string, callback: () => T): T {
  const store = new Map<string, string>();
  store.set('correlationId', ensureCorrelationId(correlationId));
  return asyncLocalStorage.run(store, callback);
}

/** Represents the  correlation id interceptor component. */
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  /**
   * Executes the intercept operation.
   *
   * @param context - The context parameter
   * @param next - The next parameter
   * @returns Result of type Observable<unknown>
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const contextType = context.getType<string>();

    // Skip non-HTTP contexts (e.g. RabbitMQ @RabbitSubscribe/@RabbitRPC handlers)
    if (contextType !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    if (!request?.headers) {
      return next.handle();
    }

    const correlationId = ensureCorrelationId(
      request.headers[CORRELATION_ID_HEADER],
      request.correlationId,
    );

    request.correlationId = correlationId;

    const store = new Map<string, string>();
    store.set('correlationId', correlationId);

    const response = context.switchToHttp().getResponse();
    if (typeof response.setHeader === 'function') {
      response.setHeader(CORRELATION_ID_HEADER, correlationId);
    } else if (typeof response.header === 'function') {
      response.header(CORRELATION_ID_HEADER, correlationId);
    }

    return new Observable((observer) => {
      asyncLocalStorage.run(store, () => {
        next
          .handle()
          .pipe(
            tap({
              error: () => {
                // correlation id preserved in error path
              },
            }),
          )
          .subscribe(observer);
      });
    });
  }
}

export function getCorrelationId(): string | undefined {
  return asyncLocalStorage.getStore()?.get('correlationId');
}
