import { DomainException } from '../exceptions/domain.exception';

/** Represents the  email component. */
export class Email {
  private constructor(private readonly _value: string) {}

  /**
   * Executes the create operation.
   *
   * @param email - The email parameter
   * @returns Result of type Email
   */
  static create(email: string): Email {
    const normalized = email.trim().toLowerCase();
    if (!Email.isValid(normalized)) {
      throw new DomainException(`Invalid email address: ${email}`);
    }
    return new Email(normalized);
  }

  /**
   * Executes the is valid operation.
   *
   * @param email - The email parameter
   * @returns Result of type boolean
   */
  static isValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  get value(): string {
    return this._value;
  }

  /**
   * Executes the equals operation.
   *
   * @param other - The other parameter
   * @returns Result of type boolean
   */
  equals(other: Email): boolean {
    return this._value === other._value;
  }

  /**
   * Executes the to string operation.
   *
   * @returns Result of type string
   */
  toString(): string {
    return this._value;
  }
}
