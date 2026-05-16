import { DomainException } from '../exceptions/domain.exception';

/** Represents the  password component. */
export class Password {
  private constructor(private readonly _hashed: string) {}

  /**
   * Executes the from hashed operation.
   *
   * @param hashed - The hashed parameter
   * @returns Result of type Password
   */
  static fromHashed(hashed: string): Password {
    if (!hashed) throw new DomainException('Password hash cannot be empty');
    return new Password(hashed);
  }

  /**
   * Executes the validate strength operation.
   *
   * @param plain - The plain parameter
   */
  static validateStrength(plain: string): void {
    if (plain.length < 8) {
      throw new DomainException('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(plain)) {
      throw new DomainException('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(plain)) {
      throw new DomainException('Password must contain at least one number');
    }
  }

  get hashed(): string {
    return this._hashed;
  }
}
