/** Interface representing data constraints for  user rating props. */
export interface UserRatingProps {
  id: string;
  raterId: string;
  targetId: string;
  score: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Interface representing data constraints for  average rating. */
export interface AverageRating {
  average: number;
  count: number;
}

/** Domain Entity representing a user rating. */
export class UserRating {
  private props: UserRatingProps;

  private constructor(props: UserRatingProps) {
    this.props = props;
  }

  /**
   * Creates a new UserRating entity.
   *
   * @param params - The creation parameters
   * @returns A new UserRating instance
   */
  static create(params: {
    raterId: string;
    targetId: string;
    score: number;
    comment?: string;
  }): UserRating {
    const now = new Date();
    return new UserRating({
      id: '',
      raterId: params.raterId,
      targetId: params.targetId,
      score: params.score,
      comment: params.comment,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reconstitutes a UserRating entity from persisted data.
   *
   * @param props - The persisted props
   * @returns A reconstituted UserRating instance
   */
  static reconstitute(props: UserRatingProps): UserRating {
    return new UserRating(props);
  }

  get id(): string {
    return this.props.id;
  }

  set id(value: string) {
    this.props.id = value;
  }

  get raterId(): string {
    return this.props.raterId;
  }

  get targetId(): string {
    return this.props.targetId;
  }

  get score(): number {
    return this.props.score;
  }

  set score(value: number) {
    this.props.score = value;
  }

  get comment(): string | undefined {
    return this.props.comment;
  }

  set comment(value: string | undefined) {
    this.props.comment = value;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  set createdAt(value: Date) {
    this.props.createdAt = value;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  set updatedAt(value: Date) {
    this.props.updatedAt = value;
  }
}
