/** CQRS Command designed to reset a user's password using a valid reset token. */
export class ResetPasswordCommand {
  constructor(
    public readonly token: string,
    public readonly newPassword: string,
    public readonly correlationId?: string,
  ) {}
}
