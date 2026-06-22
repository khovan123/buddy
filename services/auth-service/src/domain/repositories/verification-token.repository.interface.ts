export type VerificationTokenPurpose = 'EMAIL_VERIFICATION' | 'TWO_FA' | 'PASSWORD_RESET';

/** Interface representing data constraints for verification token repository. */
export interface IVerificationTokenRepository {
  save(email: string, token: string, purpose: VerificationTokenPurpose, ttlSeconds: number): Promise<void>;
  find(email: string, purpose: VerificationTokenPurpose): Promise<string | null>;
  delete(email: string, purpose: VerificationTokenPurpose): Promise<void>;
}
