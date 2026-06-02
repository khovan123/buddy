// ─────────────────────────────────────────────────────────────
// Auth Feature Types — khớp với backend auth-service handlers
// Source of truth:
//   - login-user.handler.ts
//   - register-user.handler.ts (RegisterUserResult)
//   - verify-otp.handler.ts
// ─────────────────────────────────────────────────────────────

/** Credential flow discriminator used internally by NextAuth authorize */
export const CredentialPurpose = {
  VERIFY_OTP: "VERIFY_OTP",
} as const
export type CredentialPurpose =
  (typeof CredentialPurpose)[keyof typeof CredentialPurpose]

/** OTP purpose — matches backend otp.vo.ts */
export enum OtpPurpose {
  EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
  TWO_FA = "TWO_FA",
}

/** User metadata returned in all auth responses */
export interface AuthUser {
  id: string
  email: string
  nickname: string
  role: string
  roles?: string[]
  subscriptionPlan?: string | null
}

/**
 * Login response — discriminated union based on `requiresVerification`.
 *
 * Backend login-user.handler.ts returns two shapes:
 * 1. Email not verified → { requiresVerification: true, email, user }
 * 2. Normal login → { user, accessToken, refreshToken, accessExpiresIn }
 */
export type LoginResponse = LoginSuccessResponse | LoginRequiresVerification

export interface LoginSuccessResponse {
  requiresVerification?: false
  user: AuthUser
  accessToken: string
  refreshToken: string
  accessExpiresIn: number
}

export interface LoginRequiresVerification {
  requiresVerification: true
  email: string
  user: AuthUser
}

/** register-user.handler.ts → RegisterUserResult */
export interface RegisterResponse {
  userId: string
  email: string
  requiresVerification: boolean
}

/** verify-otp.handler.ts → return shape */
export interface VerifyOtpResponse {
  user: AuthUser
  accessToken: string
  refreshToken: string
  accessExpiresIn: number
}

/** refresh-token.handler.ts → return shape */
export interface RefreshTokenResponse {
  accessToken: string
  refreshToken?: string
}
