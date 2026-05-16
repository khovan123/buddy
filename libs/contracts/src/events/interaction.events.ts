import { BaseEvent } from './base.event';

// ─── Interaction Types ─────────────────────────────────────────────────────────

export type InteractionContentType =
  | 'RESOURCE'
  | 'TUTORIAL'
  | 'RESOURCE_COLLECTION'
  | 'TUTORIAL_COLLECTION';

export enum InteractionAction {
  VIEW_PREVIEW = 'VIEW_PREVIEW',
  LIKE = 'LIKE',
  UNLIKE = 'UNLIKE',
  COMMENT = 'COMMENT',
  RATING = 'RATING',
  DOWNLOAD = 'DOWNLOAD',
  PURCHASE = 'PURCHASE',
}

/** Pre-defined signal weights for each interaction type. */
export const INTERACTION_WEIGHTS: Record<InteractionAction, number> = {
  [InteractionAction.VIEW_PREVIEW]: 1.0,
  [InteractionAction.LIKE]: 5.0,
  [InteractionAction.UNLIKE]: -5.0,
  [InteractionAction.COMMENT]: 6.0,
  [InteractionAction.RATING]: 6.0, // multiplied by stars/5 at runtime → 2.0–10.0
  [InteractionAction.DOWNLOAD]: 8.0,
  [InteractionAction.PURCHASE]: 10.0,
};

// ─── Event Constants ───────────────────────────────────────────────────────────

export const INTERACTION_ROUTINGKEYS = {
  TRACKED: 'INTERACTION_TRACKED',
} as const;

// ─── Event Payload ─────────────────────────────────────────────────────────────

export interface InteractionPayload {
  userId: string;
  itemId: string;
  itemType: InteractionContentType;
  action: InteractionAction;
  weight: number;
  metadata?: {
    ratingValue?: number;
    commentId?: string;
    majorId?: string;
    courseId?: string;
    semester?: number;
  };
}

// ─── Domain Event ──────────────────────────────────────────────────────────────

/** Emitted when a user interaction is recorded by the interaction-service. */
export class InteractionTrackedEvent extends BaseEvent {
  get routingKey(): string {
    return INTERACTION_ROUTINGKEYS.TRACKED;
  }

  constructor(
    public readonly payload: InteractionPayload,
    correlationId?: string,
  ) {
    super(correlationId);
  }
}
