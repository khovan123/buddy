import { randomUUID } from 'crypto';

/** Represents the  base event component. */
export abstract class BaseEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly version: number = 1;
  readonly payload?: unknown;

  constructor(
    public readonly correlationId?: string,
    public readonly causationId?: string,
  ) {
    this.eventId = randomUUID();
    this.occurredAt = new Date();
  }

  abstract get routingKey(): string;
}

/**
 * Represents a generic incoming RabbitMQ message payload containing event data.
 * Used to avoid `any` and enforce type safety in consumers.
 */
export type RmqMessagePayload<T = unknown> =
  | T
  | { payload: T }
  | { data: T }
  | { data: { payload: T } }
  | Record<string, unknown>;

/**
 * Helper function to safely extract the payload from a generic RabbitMQ message.
 * Supports unwrapping NestJS Microservices format ({ data: ... }), event envelopes
 * ({ data: { payload } }), and direct { payload } format.
 */
export function extractRmqPayload<T>(
  message: RmqMessagePayload<T>,
  payloadKeys: readonly string[] = [],
): T {
  let current: unknown = message;

  for (let depth = 0; depth < 5; depth += 1) {
    const decoded = decodeSerializedPayload(current);
    if (decoded !== current) {
      current = decoded;
      continue;
    }

    if (!current || typeof current !== 'object') {
      break;
    }

    if (hasAnyKey(current, payloadKeys)) {
      break;
    }

    if ('data' in current) {
      const data = (current as { data: unknown }).data;
      if (data && typeof data === 'object' && 'payload' in data) {
        current = (data as { payload: unknown }).payload;
        continue;
      }

      current = data;
      continue;
    }

    if ('payload' in current) {
      current = (current as { payload: unknown }).payload;
      continue;
    }

    break;
  }

  return current as T;
}

function decodeSerializedPayload(source: unknown): unknown {
  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (!trimmed || !['{', '['].includes(trimmed[0])) {
      return source;
    }

    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return source;
    }
  }

  if (isSerializedBuffer(source)) {
    try {
      const text = Buffer.from(source.data).toString('utf8').trim();
      return text ? JSON.parse(text) : source;
    } catch {
      return source;
    }
  }

  return source;
}

function isSerializedBuffer(source: unknown): source is { type: 'Buffer'; data: number[] } {
  return (
    Boolean(source) &&
    typeof source === 'object' &&
    (source as { type?: unknown }).type === 'Buffer' &&
    Array.isArray((source as { data?: unknown }).data)
  );
}

function hasAnyKey(source: object, keys: readonly string[]): boolean {
  return keys.length > 0 && keys.some((key) => key in source);
}
