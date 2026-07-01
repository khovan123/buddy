import {
  ContentModerationStatus,
  TutorialStatus,
} from '../../infrastructure/persistence/mongo/schemas/tutorial.schema';
import { CourseStatus } from '../entities/course.entity';
import { MajorStatus } from '../entities/major.entity';
import { Tutorial, TutorialMedia } from '../entities/tutorial.entity';

export interface TutorialQueryMajor {
  id: string;
  code: string;
  name: string;
  description: string;
  status: MajorStatus;
}

export interface TutorialQueryCourse {
  id: string;
  code: string;
  name: string;
  credits: number;
  semester: number;
  isCompulsory: boolean;
  status: CourseStatus;
}

/** Interface representing data constraints for  tutorial list query params. */
export interface TutorialListQueryParams {
  page: number;
  limit: number;
  search?: string;
  userId?: string;
  semester?: number;
  majorId?: string;
  courseId?: string;
  price?: 'free' | 'paid';
  verified?: boolean;
  sort?: 'newest' | 'popular' | 'rating';
}

/** Interface representing data constraints for  tutorial query meta. */
export interface TutorialQueryMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Interface representing data constraints for  tutorial collection details. */
export interface TutorialCollectionDetails {
  _id: string;
  userId: string;
  title: string;
  description: string;
  hightlights: string[];
  type: string;
  discount: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/** Interface representing data constraints for  tutorial resource details. */
export interface TutorialResourceDetails {
  _id: string;
  userId: string;
  title: string;
  slug: string;
  summary: string;
  hightlights: string[];
  price: number;
  status: string;
  resourceVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/** Interface representing data constraints for  tutorial query count. */
export interface TutorialQueryCount {
  tutorialMedia: number;
  tutorialOrders: number;
}

import { UserProfileRpcResponseDto } from '@libs/contracts';

/** Interface representing data constraints for  tutorial query item. */
export interface TutorialQueryItem {
  id: string;
  userId: string;
  title: string;
  slug: string;
  description: string;
  hightlights: string[];
  majorId: string;
  courseId: string;
  price: number;
  status: TutorialStatus;
  moderationStatus: ContentModerationStatus;
  moderationScore?: number | null;
  moderationReasons: string[];
  moderationRuleVersion?: string | null;
  moderatedAt?: Date | null;
  isVerified: boolean;
  discountBundle: number;
  media: TutorialMedia;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  collectionId?: string | null;
  collection?: TutorialCollectionDetails | null;
  resourceIds?: string[] | null;
  resources?: TutorialResourceDetails[] | null;
  collectionIds?: string[] | null;
  steps?: Array<{
    title: string;
    resources: Array<{
      resourceId: string;
      instructionNote: string;
      resource?: {
        id: string;
        slug: string;
        title: string;
        summary: string;
      };
    }>;
  }>;
  trailerUrl?: string | null;
  thumbnailUrl?: string | null;
  _count: TutorialQueryCount;
  uploader?: UserProfileRpcResponseDto;
  major?: TutorialQueryMajor;
  course?: TutorialQueryCourse;
}

/** Interface representing data constraints for  tutorial query result. */
export interface TutorialQueryResult {
  data: TutorialQueryItem[];
  meta: TutorialQueryMeta;
}

export interface ContentModerationPersistenceResult {
  status: ContentModerationStatus;
  score?: number | null;
  reasons: string[];
  ruleVersion?: string | null;
}

export interface TutorialUpdateDetails {
  title: string;
  description: string;
  hightlights: string[];
  majorId: string;
  courseId: string;
  price: number;
  discountBundle: number;
  collectionId?: string;
  steps?: Array<{
    title: string;
    resources: Array<{ resourceId: string; instructionNote: string }>;
  }>;
}

/** Interface representing data constraints for  i tutorial repository. */
export interface ITutorialRepository {
  save(tutorial: Tutorial): Promise<void>;
  saveMedia(tutorialId: string, media: TutorialMedia): Promise<void>;
  deleteAllByUserId(userId: string): Promise<void>;
  findById(id: string): Promise<Tutorial | null>;
  findByIds(ids: string[]): Promise<Tutorial[]>;
  findBySlug(slug: string): Promise<Tutorial | null>;
  findByResourceIds(resourceIds: string[]): Promise<Tutorial[] | null>;
  findByCollectionId(collectionId: string): Promise<Tutorial | null>;
  findMediaById(fileId: string): Promise<TutorialMedia | null>;
  findMediaByTutorialId(tutorialId: string): Promise<TutorialMedia | null>;
  findByIdWithDetails(id: string): Promise<TutorialQueryItem | null>;
  findByIdsWithDetails(ids: string[]): Promise<TutorialQueryItem[]>;
  findBySlugWithDetails(slug: string): Promise<TutorialQueryItem | null>;
  findByMediaFileIdWithDetails(fileId: string): Promise<TutorialQueryItem | null>;
  findAvailableTutorials(params: TutorialListQueryParams): Promise<TutorialQueryResult>;
  findMyTutorials(params: TutorialListQueryParams): Promise<TutorialQueryResult>;
  findAvailableTutorialCollections(params: TutorialListQueryParams): Promise<TutorialQueryResult>;
  update(tutorial: Tutorial): Promise<void>;
  updateDetails(tutorialId: string, details: TutorialUpdateDetails): Promise<void>;
  updateMedia(tutorialId: string, media: TutorialMedia): Promise<void>;
  /**
   * Tìm tutorial dựa trên media.fileId (S3 key) và cập nhật streamingUrl, trailerUrl
   * @param fileId - S3 key (media.fileId)
   * @param params - {streamingUrl, trailerUrl, fileSize}
   */
  updateByFileId(
    fileId: string,
    params: { streamingUrl?: string | null; trailerUrl?: string | null; fileSize?: number },
    options?: { session?: unknown },
  ): Promise<void>;
  applyModerationResult(
    tutorialId: string,
    result: ContentModerationPersistenceResult,
    options?: { session?: unknown },
  ): Promise<void>;
  markFailedByFileId(fileId: string, options?: { session?: unknown }): Promise<void>;
  markAvailableWithProcessedMedia(
    tutorialId: string,
    params: { streamingUrl: string; trailerUrl: string },
  ): Promise<void>;
  assignCollectionToTutorials(tutorialIds: string[], collectionId: string): Promise<void>;
  findUncollectedTutorials(courseId: string, limit: number): Promise<TutorialQueryItem[]>;
  findTopTutorials(
    limit: number,
    search?: string,
    semester?: number,
    majorId?: string,
  ): Promise<TutorialQueryItem[]>;
  deletePendingOlderThan(cutoff: Date): Promise<number>;
  delete(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
}
