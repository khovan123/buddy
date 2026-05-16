import { ConfirmResourceUploadHandler } from './handlers/confirm-resource-upload.handler';
import { ConfirmTutorialUploadHandler } from './handlers/confirm-tutorial-upload.handler';
import { ProcessVideoHandler } from './handlers/process-video.handler';

export const COMMAND_HANDLERS = [
  ProcessVideoHandler,
  ConfirmResourceUploadHandler,
  ConfirmTutorialUploadHandler,
];
