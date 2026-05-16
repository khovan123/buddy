/** CQRS Command designed to enforce  send password reset email. */
export class SendPasswordResetEmailCommand {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly nickname: string,
    public readonly resetToken: string,
    public readonly expiresAt: Date,
    public readonly correlationId?: string,
  ) {}
}
