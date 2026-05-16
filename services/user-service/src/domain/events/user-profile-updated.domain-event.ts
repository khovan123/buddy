/** Represents the  user profile updated domain event component. */
export class UserProfileUpdatedDomainEvent {
  constructor(
    public readonly payload: {
      userId: string;
      changes: Record<string, unknown>;
      updatedAt: Date;
    },
  ) {}
}
