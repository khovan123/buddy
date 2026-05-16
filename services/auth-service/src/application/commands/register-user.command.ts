/** CQRS Command designed to enforce  register user. */
export class RegisterUserCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly nickname: string,
    public readonly correlationId?: string,
  ) {}
}
