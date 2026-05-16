/** Represents the  user registered domain event component. */
export class UserRegisteredDomainEvent {
  constructor(
    public readonly payload: {
      userId: string;
      email: string;
      nickname: string;
    },
  ) {}
}
