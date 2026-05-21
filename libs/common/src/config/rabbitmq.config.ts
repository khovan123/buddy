// ─── Exchange names ────────────────────────────────────────────────────────────
export const EXCHANGES = {
  AUTH: 'auth.events',
  USER: 'user.events',
  BILLING: 'billing.events',
  ACCESS: 'access.events',
  NOTIFICATION: 'notification.events',
  UPLOAD: 'upload.events',
  INTERACTION: 'interaction.events',
  CONTENT: 'content.events',
  CONTENT_SYNC: 'content.sync',
  DEAD_LETTER: 'dead.letter',
} as const;

// ─── Queue names ───────────────────────────────────────────────────────────────
export const QUEUES = {
  AUTH_COMMANDS: 'auth.commands',
  USER_COMMANDS: 'user.commands',
  BILLING_COMMANDS: 'billing.commands',
  ACCESS_COMMANDS: 'access.commands',
  NOTIFICATION_EMAIL: 'notification.send.email',
  NOTIFICATION_PUSH: 'notification.send.push',
  NOTIFICATION_RETRY: 'notification.retry.delay',
  UPLOAD_VIDEO_COMMANDS: 'upload.video.commands',
  UPLOAD_RPC: 'upload.rpc',
  UPLOAD_THUMBNAIL: 'upload.thumbnail',
  CONTENT_COMMANDS: 'content.commands',
  CONTENT_VIDEO_EVENTS: 'content.video.events',
  CONTENT_RESOURCE_EVENTS: 'content.resource.events',
  VIDEO_PROCESSING_QUEUE: 'upload.video.processing',
  DOCUMENT_PREVIEW_QUEUE: 'upload.document.preview',
  USER_RPC_GET_PROFILES: 'user.rpc.get_profiles',
  USER_EVENTS: 'user.events',
  CONTENT_USER_EVENTS: 'content.user.events',
  BILLING_COMPENSATION: 'billing.compensation',
  UPLOAD_COMPENSATION: 'upload.compensation',
  INTERACTION_EVENTS: 'interaction.events',
  RECOMMENDATION_EVENTS: 'recommendation.events',
  RECOMMENDATION_CONTENT_SYNC: 'recommendation.content.sync',
  RAG_CONTENT_SYNC: 'rag.content.sync',
  RECOMMENDATION_USER_SYNC: 'recommendation.user.sync',
  NOTIFICATION_MODEL_TRAINED: 'notification.model.trained',
} as const;

// ─── Retry options ─────────────────────────────────────────────────────────────
export const RETRY_OPTIONS = {
  MAX_RETRIES: 3,
  DELAY_MS: 30_000,
} as const;
