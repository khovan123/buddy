/** CQRS Command designed to enforce  login user. */
export class LoginUserCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly ipAddress?: string,
    public readonly userAgent?: string,
    public readonly correlationId?: string,
  ) {}
}
