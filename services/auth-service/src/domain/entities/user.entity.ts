import { randomUUID as uuidv4 } from 'node:crypto';
import { UserRegisteredDomainEvent } from '../events/user-registered.domain-event';
import { DomainException } from '../exceptions/domain.exception';
import { Email } from '../value-objects/email.vo';
import { Password } from '../value-objects/password.vo';

export type UserRole = 'admin' | 'user' | 'moderator';
export type UserStatus = 'active' | 'inactive' | 'banned' | 'pending_verification';

export const DEFAULT_SUBSCRIPTION_PLAN = 'STUDENT_FREE';

/** Interface representing data constraints for  user props. */
export interface UserProps {
  id: string;
  email: Email;
  password: Password;
  nickname: string;
  roles: UserRole[];
  subscriptionPlan: string | null;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

/** Represents the  user component. */
export class User {
  private readonly _domainEvents: UserRegisteredDomainEvent[] = [];

  private constructor(private props: UserProps) {}

  // ── Factory ───────────────────────────────────────────────────────
  /**
   * Executes the create operation.
   *
   * @param params - The params parameter
   * @returns Result of type User
   */
  static create(params: { email: string; hashedPassword: string; nickname: string }): User {
    const now = new Date();
    const user = new User({
      id: uuidv4(),
      email: Email.create(params.email),
      password: Password.fromHashed(params.hashedPassword),
      nickname: params.nickname.trim(),
      roles: ['user'],
      subscriptionPlan: DEFAULT_SUBSCRIPTION_PLAN,
      status: 'pending_verification',
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    user._domainEvents.push(
      new UserRegisteredDomainEvent({
        userId: user.id,
        email: user.email.value,
        nickname: user.nickname,
      }),
    );

    return user;
  }

  /**
   * Executes the reconstitute operation.
   *
   * @param props - The props parameter
   * @returns Result of type User
   */
  static reconstitute(props: UserProps): User {
    return new User(props);
  }

  // ── Behaviour ─────────────────────────────────────────────────────
  /**
   * Executes the verify email operation.
   *
   */
  verifyEmail(): void {
    if (this.props.emailVerified) {
      throw new DomainException('Email already verified');
    }
    this.props.emailVerified = true;
    this.props.status = 'active';
    this.props.updatedAt = new Date();
  }

  /**
   * Executes the record login operation.
   *
   */
  recordLogin(): void {
    if (this.props.status === 'banned') {
      throw new DomainException('User account is banned');
    }
    if (this.props.status === 'inactive') {
      throw new DomainException('User account is inactive');
    }
    this.props.lastLoginAt = new Date();
    this.props.updatedAt = new Date();
  }

  /**
   * Executes the change password operation.
   *
   * @param newHashedPassword - The newHashedPassword parameter
   */
  changePassword(newHashedPassword: string): void {
    this.props.password = Password.fromHashed(newHashedPassword);
    this.props.updatedAt = new Date();
  }

  /**
   * Executes the deactivate operation.
   *
   */
  deactivate(): void {
    if (this.props.status === 'inactive') return;
    this.props.status = 'inactive';
    this.props.updatedAt = new Date();
  }

  /**
   * Executes the is active operation.
   *
   * @returns Result of type boolean
   */
  isActive(): boolean {
    return this.props.status === 'active';
  }

  /**
   * Executes the can login operation.
   *
   * @returns Result of type boolean
   */
  canLogin(): boolean {
    return this.props.status === 'active' || this.props.status === 'pending_verification';
  }

  // ── Domain events ─────────────────────────────────────────────────
  /**
   * Executes the pull domain events operation.
   *
   * @returns Result of type UserRegisteredDomainEvent[]
   */
  pullDomainEvents(): UserRegisteredDomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents.length = 0;
    return events;
  }

  // ── Getters ───────────────────────────────────────────────────────
  get id(): string {
    return this.props.id;
  }
  get email(): Email {
    return this.props.email;
  }
  get password(): Password {
    return this.props.password;
  }
  get nickname(): string {
    return this.props.nickname;
  }
  get roles(): UserRole[] {
    return [...this.props.roles];
  }
  get status(): UserStatus {
    return this.props.status;
  }
  get emailVerified(): boolean {
    return this.props.emailVerified;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt;
  }
  get subscriptionPlan(): string | null {
    return this.props.subscriptionPlan;
  }
}
