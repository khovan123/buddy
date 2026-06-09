import { BaseEvent } from './base.event';

// ─── Routing keys ─────────────────────────────────────────────────
export const AUTH_ROUTINGKEYS = {
  USER_REGISTERED: 'auth.user.registered',
  USER_LOGGED_IN: 'auth.user.logged_in',
  USER_LOGGED_OUT: 'auth.user.logged_out',
  PASSWORD_CHANGED: 'auth.password.changed',
  PASSWORD_RESET_REQUESTED: 'auth.password.reset_requested',
  TOKEN_REFRESHED: 'auth.token.refreshed',
  OTP_GENERATED: 'auth.otp.generated',
} as const;

// ─── Payloads ─────────────────────────────────────────────────────
/** Represents the  user registered event component. */
export class UserRegisteredEvent extends BaseEvent {
  get routingKey() {
    return AUTH_ROUTINGKEYS.USER_REGISTERED;
  }

  constructor(
    public readonly payload: {
      userId: string;
      email: string;
      username: string;
      nickname: string;
      registeredAt: Date;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Represents the  user logged in event component. */
export class UserLoggedInEvent extends BaseEvent {
  get routingKey() {
    return AUTH_ROUTINGKEYS.USER_LOGGED_IN;
  }

  constructor(
    public readonly payload: {
      userId: string;
      email: string;
      ipAddress: string;
      userAgent: string;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Represents the  password reset requested event component. */
export class PasswordResetRequestedEvent extends BaseEvent {
  get routingKey() {
    return AUTH_ROUTINGKEYS.PASSWORD_RESET_REQUESTED;
  }

  constructor(
    public readonly payload: {
      userId: string;
      email: string;
      resetToken: string;
      expiresAt: Date;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}

/** Represents the  otp generated event component. */
export class OtpGeneratedEvent extends BaseEvent {
  get routingKey() {
    return AUTH_ROUTINGKEYS.OTP_GENERATED;
  }

  constructor(
    public readonly payload: {
      email: string;
      otp: string;
      purpose: string;
      expiresAt: Date;
    },
    correlationId?: string,
  ) {
    super(correlationId);
  }
}
