import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import {
  context as otelContext,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
  type Span,
} from '@opentelemetry/api';
import { defer, Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

type UnknownRecord = Record<string, unknown>;
type TextMapCarrier = Record<string, unknown>;

/** Represents the  otel tracing interceptor component. */
@Injectable()
export class OtelTracingInterceptor implements NestInterceptor {
  private readonly tracer = trace.getTracer('microservice');

  /**
   * Executes the intercept operation.
   *
   * @param executionContext - The executionContext parameter
   * @param next - The next parameter
   * @returns Result of type Observable<unknown>
   */
  intercept(executionContext: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (executionContext.getType<'rpc' | 'http' | 'ws'>() !== 'rpc') {
      return next.handle();
    }

    const rpcHost = executionContext.switchToRpc();
    const data = rpcHost.getData<unknown>();
    const rpcContext = rpcHost.getContext<unknown>();

    const carrier = this.resolveCarrier(data, rpcContext);
    const extractedContext = propagation.extract(otelContext.active(), carrier);

    const span = this.tracer.startSpan(
      this.resolveSpanName(executionContext),
      {
        kind: SpanKind.CONSUMER,
      },
      extractedContext,
    );

    const parentAwareContext = trace.setSpan(extractedContext, span);
    this.attachCorrelationIdAttribute(span, data, carrier);

    return defer(() =>
      otelContext.with(parentAwareContext, () => {
        let hasError = false;

        return next.handle().pipe(
          catchError((error: unknown) => {
            hasError = true;
            this.captureError(span, error);
            return throwError(() => error);
          }),
          finalize(() => {
            if (!hasError) {
              span.setStatus({ code: SpanStatusCode.OK });
            }
            span.end();
          }),
        );
      }),
    );
  }

  /**
   * Executes the resolve span name operation.
   *
   * @param executionContext - The executionContext parameter
   * @returns Result of type string
   */
  private resolveSpanName(executionContext: ExecutionContext): string {
    const controllerName = executionContext.getClass().name;
    const handlerName = executionContext.getHandler().name;
    return `${controllerName}.${handlerName}`;
  }

  /**
   * Executes the resolve carrier operation.
   *
   * @param data - The data parameter
   * @param rpcContext - The rpcContext parameter
   * @returns Result of type TextMapCarrier
   */
  private resolveCarrier(data: unknown, rpcContext: unknown): TextMapCarrier {
    const carrier: TextMapCarrier = {};

    this.appendCarrier(carrier, this.readRecordValue(data, 'headers'));
    this.appendCarrier(carrier, this.readRecordValue(data, 'metadata'));
    this.appendCarrier(carrier, this.readContextHeaders(rpcContext));

    return carrier;
  }

  /**
   * Executes the read context headers operation.
   *
   * @param rpcContext - The rpcContext parameter
   * @returns Result of type unknown
   */
  private readContextHeaders(rpcContext: unknown): unknown {
    if (!this.isRecord(rpcContext)) {
      return undefined;
    }

    const getMessage = rpcContext.getMessage;
    if (typeof getMessage !== 'function') {
      return undefined;
    }

    const message = getMessage.call(rpcContext) as unknown;
    if (!this.isRecord(message)) {
      return undefined;
    }

    const directHeaders = this.readRecordValue(message, 'headers');
    if (directHeaders) {
      return directHeaders;
    }

    const properties = this.readRecordValue(message, 'properties');
    return this.readRecordValue(properties, 'headers');
  }

  /**
   * Executes the append carrier operation.
   *
   * @param target - The target parameter
   * @param source - The source parameter
   */
  private appendCarrier(target: TextMapCarrier, source: unknown): void {
    if (!this.isRecord(source)) {
      return;
    }

    for (const [key, value] of Object.entries(source)) {
      const normalized = this.normalizeCarrierValue(value);
      if (normalized !== undefined) {
        target[key] = normalized;
      }
    }
  }

  /**
   * Executes the normalize carrier value operation.
   *
   * @param value - The value parameter
   * @returns Result of type string | undefined
   */
  private normalizeCarrierValue(value: unknown): string | undefined {
    if (typeof value === 'string') {
      return value;
    }

    if (Buffer.isBuffer(value)) {
      return value.toString('utf8');
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const normalized = this.normalizeCarrierValue(item);
        if (normalized !== undefined) {
          return normalized;
        }
      }
      return undefined;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return undefined;
  }

  /**
   * Executes the attach correlation id attribute operation.
   *
   * @param span - The span parameter
   * @param data - The data parameter
   * @param carrier - The carrier parameter
   */
  private attachCorrelationIdAttribute(span: Span, data: unknown, carrier: TextMapCarrier): void {
    const correlationId = this.extractCorrelationId(data, carrier);
    if (correlationId) {
      span.setAttribute('custom.correlation_id', correlationId);
    }
  }

  /**
   * Executes the extract correlation id operation.
   *
   * @param data - The data parameter
   * @param carrier - The carrier parameter
   * @returns Result of type string | undefined
   */
  private extractCorrelationId(data: unknown, carrier: TextMapCarrier): string | undefined {
    const fromCarrier = this.firstDefinedString(
      this.readRecordValue(carrier, 'correlationId'),
      this.readRecordValue(carrier, 'x-correlation-id'),
    );

    if (fromCarrier) {
      return fromCarrier;
    }

    if (!this.isRecord(data)) {
      return undefined;
    }

    const dataHeaders = this.readRecordValue(data, 'headers');

    return this.firstDefinedString(
      this.readRecordValue(data, 'correlationId'),
      this.readRecordValue(data, 'x-correlation-id'),
      this.readRecordValue(dataHeaders, 'correlationId'),
      this.readRecordValue(dataHeaders, 'x-correlation-id'),
    );
  }

  /**
   * Executes the first defined string operation.
   *
   * @param values - The values parameter
   * @returns Result of type string | undefined
   */
  private firstDefinedString(...values: unknown[]): string | undefined {
    for (const value of values) {
      const normalized = this.normalizeCarrierValue(value);
      if (normalized && normalized.trim().length > 0) {
        return normalized;
      }
    }

    return undefined;
  }

  /**
   * Executes the capture error operation.
   *
   * @param span - The span parameter
   * @param error - The error parameter
   */
  private captureError(span: Span, error: unknown): void {
    if (error instanceof Error) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      return;
    }

    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: 'Unknown interceptor error',
    });
  }

  /**
   * Executes the read record value operation.
   *
   * @param source - The source parameter
   * @param key - The key parameter
   * @returns Result of type unknown
   */
  private readRecordValue(source: unknown, key: string): unknown {
    if (!this.isRecord(source)) {
      return undefined;
    }

    return source[key];
  }

  /**
   * Executes the is record operation.
   *
   * @param value - The value parameter
   * @returns Result of type value is UnknownRecord
   */
  private isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null;
  }
}
