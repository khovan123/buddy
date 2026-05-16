/** CQRS Command designed to enforce  refresh token. */
export class RefreshTokenCommand {
  constructor(public readonly rawRefreshToken: string) {}
}
