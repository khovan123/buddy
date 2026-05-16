import {
  context as otelContext,
  propagation,
  type Context as OtelContext,
} from '@opentelemetry/api';

export type TraceContextCarrier = Record<string, string>;
export type GenericHeaders = Record<string, unknown>;

/** Interface representing data constraints for  message headers. */
export interface MessageHeaders {
  headers?: TraceContextCarrier;
  [key: string]: unknown;
}

/**
 * Injects the currently active OpenTelemetry context (traceparent/tracestate)
 * into a mutable carrier that can be attached to outgoing message headers.
 */
export function injectTraceContext(
  carrier: TraceContextCarrier = {},
  sourceContext: OtelContext = otelContext.active(),
): TraceContextCarrier {
  propagation.inject(sourceContext, carrier);
  return carrier;
}

/**
 * Returns a new headers object containing existing headers and the current trace context.
 */
export function createTracedHeaders(baseHeaders: TraceContextCarrier = {}): TraceContextCarrier {
  const carrier: TraceContextCarrier = { ...baseHeaders };
  return injectTraceContext(carrier);
}

/**
 * Merges W3C trace headers into generic metadata headers (e.g., AMQP headers).
 * Existing header values are preserved, and trace headers are added/overridden.
 */
export function mergeTraceContextIntoHeaders(baseHeaders: GenericHeaders = {}): GenericHeaders {
  const existingTraceCarrier: TraceContextCarrier = {};

  for (const [key, value] of Object.entries(baseHeaders)) {
    if (typeof value === 'string') {
      existingTraceCarrier[key] = value;
    }
  }

  const tracedCarrier = injectTraceContext(existingTraceCarrier);

  return {
    ...baseHeaders,
    ...tracedCarrier,
  };
}

/**
 * Utility for API Gateway sender side: merges OpenTelemetry trace headers
 * into a message envelope that contains a headers object.
 */
export function attachTraceContextToMessage<T extends MessageHeaders>(message: T): T {
  const tracedHeaders = createTracedHeaders(message.headers ?? {});
  return {
    ...message,
    headers: tracedHeaders,
  };
}
