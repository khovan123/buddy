import { GetBatchUploadHistoryByContentHandler } from './handlers/get-batch-upload-history-by-content.handler';
import { GetFileStatusHandler } from './handlers/get-file-status.handler';
import { GetPreviewUrlHandler } from './handlers/get-preview-url.handler';
import { GetUploadHistoryByContentHandler } from './handlers/get-upload-history-by-content.handler';
import { GetUploadHistoryByUserHandler } from './handlers/get-upload-history-by-user.handler';
import { GetUploadHistoryHandler } from './handlers/get-upload-history.handler';
import { GetUploadUrlHandler } from './handlers/get-upload-url.handler';

export const QUERY_HANDLERS = [
  GetFileStatusHandler,
  GetUploadUrlHandler,
  GetUploadHistoryHandler,
  GetUploadHistoryByContentHandler,
  GetBatchUploadHistoryByContentHandler,
  GetUploadHistoryByUserHandler,
  GetPreviewUrlHandler,
];
