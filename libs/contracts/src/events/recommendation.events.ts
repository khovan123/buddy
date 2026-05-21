/**
 * Recommendation sync event types — used by content-service publisher
 * and matched by recommendation-service Python consumer.
 */
export const RECOMMENDATION_SYNC_TYPES = {
  ITEM_UPSERT: 'ITEM_UPSERT',
  ITEM_DELETED: 'ITEM_DELETED',
  COURSE_UPSERT: 'COURSE_UPSERT',
  COURSE_DELETED: 'COURSE_DELETED',
  MAJOR_UPSERT: 'MAJOR_UPSERT',
  MAJOR_DELETED: 'MAJOR_DELETED',
} as const;

export type RecommendationSyncType =
  (typeof RECOMMENDATION_SYNC_TYPES)[keyof typeof RECOMMENDATION_SYNC_TYPES];

/** Payload shape for ITEM_UPSERT / ITEM_DELETED */
export interface ItemSyncPayload {
  type:
    | typeof RECOMMENDATION_SYNC_TYPES.ITEM_UPSERT
    | typeof RECOMMENDATION_SYNC_TYPES.ITEM_DELETED;
  itemId: string;
  itemType?: string;
  majorId?: string;
  courseId?: string;
  title?: string;
  slug?: string;
  /** Resource body text for RAG indexing. */
  summary?: string;
  /** Tutorial body text for RAG indexing. */
  description?: string;
  /** Key bullet points for RAG indexing. */
  hightlights?: string[];
  /** Tutorial step outlines for RAG indexing. */
  steps?: Array<{ title: string; description?: string }>;
}

/** Payload shape for COURSE_UPSERT / COURSE_DELETED */
export interface CourseSyncPayload {
  type:
    | typeof RECOMMENDATION_SYNC_TYPES.COURSE_UPSERT
    | typeof RECOMMENDATION_SYNC_TYPES.COURSE_DELETED;
  courseId: string;
  majorId?: string;
  semester?: number;
  code?: string;
  name?: string;
}

/** Payload shape for MAJOR_UPSERT / MAJOR_DELETED */
export interface MajorSyncPayload {
  type:
    | typeof RECOMMENDATION_SYNC_TYPES.MAJOR_UPSERT
    | typeof RECOMMENDATION_SYNC_TYPES.MAJOR_DELETED;
  majorId: string;
  code?: string;
  name?: string;
}

export type RecommendationContentSyncPayload =
  | ItemSyncPayload
  | CourseSyncPayload
  | MajorSyncPayload;

/** Routing keys for recommendation domain events. */
export const RECOMMENDATION_ROUTINGKEYS = {
  MODEL_TRAINED: 'recommendation.model.trained',
} as const;
