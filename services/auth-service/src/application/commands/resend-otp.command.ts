import type { OtpPurpose } from '../../domain/value-objects/otp.vo';

/** CQRS Command designed to enforce  resend otp. */
export class ResendOtpCommand {
  constructor(
    public readonly email: string,
    public readonly purpose: OtpPurpose = 'EMAIL_VERIFICATION',
    public readonly correlationId?: string,
  ) {}
}
