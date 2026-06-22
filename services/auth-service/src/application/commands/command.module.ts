import { ChangePasswordHandler } from './handlers/change-password.handler';
import { ForgotPasswordHandler } from './handlers/forgot-password.handler';
import { LoginUserHandler } from './handlers/login-user.handler';
import { LogoutUserHandler } from './handlers/logout-user.handler';
import { OAuthLoginHandler } from './handlers/oauth-login.handler';
import { RefreshTokenHandler } from './handlers/refresh-token.handler';
import { RegisterUserHandler } from './handlers/register-user.handler';
import { ResendOtpHandler } from './handlers/resend-otp.handler';
import { ResetPasswordHandler } from './handlers/reset-password.handler';
import { UpdateSubscriptionPlanHandler } from './handlers/update-subscription-plan.handler';
import { VerifyOtpHandler } from './handlers/verify-otp.handler';

export const COMMAND_HANDLERS = [
  RegisterUserHandler,
  LoginUserHandler,
  OAuthLoginHandler,
  RefreshTokenHandler,
  LogoutUserHandler,
  VerifyOtpHandler,
  ResendOtpHandler,
  UpdateSubscriptionPlanHandler,
  ChangePasswordHandler,
  ForgotPasswordHandler,
  ResetPasswordHandler,
];
