/** CQRS Command designed to enforce  send otp email. */
export class SendOtpEmailCommand {
  constructor(
    public readonly email: string,
    public readonly otp: string,
    public readonly purpose: string,
    public readonly expiresAt: Date,
    public readonly correlationId?: string,
  ) {}
}
