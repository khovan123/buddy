import type { OtpPurpose } from '../value-objects/otp.vo';

/** Interface representing data constraints for  i otp repository. */
export interface IOtpRepository {
  save(email: string, otp: string, purpose: OtpPurpose, ttlSeconds: number): Promise<void>;
  find(email: string, purpose: OtpPurpose): Promise<string | null>;
  delete(email: string, purpose: OtpPurpose): Promise<void>;
}
