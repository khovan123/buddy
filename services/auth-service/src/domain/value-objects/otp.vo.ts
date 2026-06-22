export type OtpPurpose = 'EMAIL_VERIFICATION' | 'TWO_FA' | 'PASSWORD_RESET';

/** Represents the  otp component. */
export class Otp {
  static readonly LENGTH = 6;
  static readonly TTL_SECONDS = 300; // 5 minutes

  /**
   * Executes the generate operation.
   *
   * @returns Result of type string
   */
  static generate(): string {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < Otp.LENGTH; i++) {
      code += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return code;
  }

  /**
   * Executes the validate operation.
   *
   * @param code - The code parameter
   * @returns Result of type boolean
   */
  static validate(code: string): boolean {
    return /^\d{6}$/.test(code);
  }
}
