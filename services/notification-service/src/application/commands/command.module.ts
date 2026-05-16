import { SendModelTrainedEmailHandler } from './handlers/send-model-trained-email.handler';
import { SendOtpEmailHandler } from './handlers/send-otp-email.handler';
import { SendPasswordResetEmailHandler } from './handlers/send-password-reset-email.handler';
import { SendWelcomeEmailHandler } from './handlers/send-welcome-email.handler';

export const COMMAND_HANDLERS = [
  SendWelcomeEmailHandler,
  SendPasswordResetEmailHandler,
  SendOtpEmailHandler,
  SendModelTrainedEmailHandler,
];
