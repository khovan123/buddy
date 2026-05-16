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
  | { data: { payload: T } }
  | Record<string, unknown>;

/**
 * Helper function to safely extract the payload from a generic RabbitMQ message.
 * Supports unwrapping NestJS Microservices format ({ data: { payload } }) and direct { payload } format.
 */
export function extractRmqPayload<T>(message: RmqMessagePayload<T>): T {
  if (message && typeof message === 'object') {
    if (
      'data' in message &&
      message.data &&
      typeof message.data === 'object' &&
      'payload' in message.data
    ) {
      return (message as { data: { payload: T } }).data.payload;
    }
    if ('payload' in message) {
      return (message as { payload: T }).payload;
    }
  }
  return message as T;
}
