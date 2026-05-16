import type { BaseEvent } from '@libs/contracts';

/**
 * Interface for publishing saga compensation events.
 * Each service that participates in a saga can implement this interface
 * to emit compensation/rollback events.
 */
export interface ISagaPublisher {
  publish(event: BaseEvent): Promise<void>;
}
