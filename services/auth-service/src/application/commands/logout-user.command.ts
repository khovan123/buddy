/** CQRS Command designed to enforce  logout user. */
export class LogoutUserCommand {
  constructor(
    public readonly userId: string,
    public readonly rawRefreshToken?: string,
  ) {}
}
