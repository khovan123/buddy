/** CQRS Command designed to request a password reset link via email. */
export class ForgotPasswordCommand {
  constructor(
    public readonly email: string,
    public readonly appUrl: string,
    public readonly correlationId?: string,
  ) {}
}
