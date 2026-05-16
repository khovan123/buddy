/** Interface representing data constraints for  follow props. */
export interface FollowProps {
  followerId: string;
  followingId: string;
  createdAt: Date;
}

/** Domain Entity representing a follow relationship. */
export class Follow {
  private props: FollowProps;

  private constructor(props: FollowProps) {
    this.props = props;
  }

  /**
   * Creates a new Follow entity.
   *
   * @param params - The creation parameters
   * @returns A new Follow instance
   */
  static create(params: { followerId: string; followingId: string }): Follow {
    return new Follow({
      followerId: params.followerId,
      followingId: params.followingId,
      createdAt: new Date(),
    });
  }

  /**
   * Reconstitutes a Follow entity from persisted data.
   *
   * @param props - The persisted props
   * @returns A reconstituted Follow instance
   */
  static reconstitute(props: FollowProps): Follow {
    return new Follow(props);
  }

  get followerId(): string {
    return this.props.followerId;
  }

  get followingId(): string {
    return this.props.followingId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
