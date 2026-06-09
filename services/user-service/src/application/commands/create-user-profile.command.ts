/** CQRS Command designed to enforce  create user profile. */
export class CreateUserProfileCommand {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly username: string,
    public readonly nickname: string,
    public readonly correlationId?: string,
  ) {}
}
