import type { InteractionAction, InteractionContentType } from '@libs/contracts';

/**
 * TrackInteractionCommand — CQRS Command to record a user interaction.
 *
 * Workflow:
 * 1. Controller creates command from validated DTO
 * 2. Handler creates InteractionEntity (weight computed in domain)
 * 3. Persist to interaction_db
 * 4. Publish event to RabbitMQ for recommendation-service
 */
export class TrackInteractionCommand {
  constructor(
    public readonly userId: string,
    public readonly itemId: string,
    public readonly itemType: InteractionContentType,
    public readonly action: InteractionAction,
    public readonly ratingValue?: number,
    public readonly commentId?: string,
    public readonly majorId?: string,
    public readonly courseId?: string,
    public readonly semester?: number,
  ) {}
}
