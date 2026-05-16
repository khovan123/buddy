import type { InteractionContentType } from '@libs/contracts';
import { INTERACTION_WEIGHTS, InteractionAction } from '@libs/contracts';

export interface InteractionProps {
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
  createdAt?: Date;
}

export class InteractionEntity {
  private readonly props: InteractionProps;

  private constructor(props: InteractionProps) {
    this.props = props;
  }

  /** Factory — creates a new interaction with computed weight. */
  static create(params: {
    userId: string;
    itemId: string;
    itemType: InteractionContentType;
    action: InteractionAction;
    ratingValue?: number;
    commentId?: string;
    majorId?: string;
    courseId?: string;
    semester?: number;
  }): InteractionEntity {
    const weight = InteractionEntity.calculateWeight(params.action, params.ratingValue);

    return new InteractionEntity({
      userId: params.userId,
      itemId: params.itemId,
      itemType: params.itemType,
      action: params.action,
      weight,
      metadata: {
        ratingValue: params.ratingValue,
        commentId: params.commentId,
        majorId: params.majorId,
        courseId: params.courseId,
        semester: params.semester,
      },
    });
  }

  /** Reconstitute from persistence layer (no domain logic applied). */
  static reconstitute(props: InteractionProps): InteractionEntity {
    return new InteractionEntity(props);
  }

  /**
   * Calculates the effective weight for an interaction.
   * For RATING actions, the base weight is scaled by (ratingValue / 5).
   */
  private static calculateWeight(action: InteractionAction, ratingValue?: number): number {
    const base = INTERACTION_WEIGHTS[action];
    if (action === InteractionAction.RATING && ratingValue != null) {
      return (base * ratingValue) / 5;
    }
    return base;
  }

  // ── Getters ──────────────────────────────────────────────────────

  get userId(): string {
    return this.props.userId;
  }
  get itemId(): string {
    return this.props.itemId;
  }
  get itemType(): InteractionContentType {
    return this.props.itemType;
  }
  get action(): InteractionAction {
    return this.props.action;
  }
  get weight(): number {
    return this.props.weight;
  }
  get metadata(): InteractionProps['metadata'] {
    return this.props.metadata;
  }
  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }
}
