/** CQRS Command designed to enforce  verify otp. */
export class VerifyOtpCommand {
  constructor(
    public readonly email: string,
    public readonly otp: string,
    public readonly ipAddress?: string,
    public readonly userAgent?: string,
    public readonly correlationId?: string,
  ) {}
}
