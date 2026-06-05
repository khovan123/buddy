import {
  ContentModerationStatus,
  ResourceStatus,
} from '../../infrastructure/persistence/mongo/schemas/resource.schema';
import { CourseStatus } from '../entities/course.entity';
import { MajorStatus } from '../entities/major.entity';
import { Resource, ResourceMeta } from '../entities/resource.entity';

export interface ResourceQueryMajor {
  id: string;
  code: string;
  name: string;
  description: string;
  status: MajorStatus;
}

export interface ResourceQueryCourse {
  id: string;
  code: string;
  name: string;
  credits: number;
  semester: number;
  isCompulsory: boolean;
  status: CourseStatus;
}

/** Interface representing data constraints for  resource list query params. */
export interface ResourceListQueryParams {
  page: number;
  limit: number;
  search?: string;
  userId?: string;
  semester?: number;
  majorId?: string;
}

/** Interface representing data constraints for  resource query meta. */
export interface ResourceQueryMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Interface representing data constraints for  resource query count. */
export interface ResourceQueryCount {
  resourceMeta: number;
  resourceOrders: number;
}

/** Interface representing data constraints for  resource collection details. */
export interface ResourceCollectionDetails {
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

import { UserProfileRpcResponseDto } from '@libs/contracts';

/** Interface representing data constraints for  resource query item. */
export interface ResourceQueryItem {
  id: string;
  userId: string;
  title: string;
  slug: string;
  summary: string;
  hightlights: string[];
  majorId: string;
  courseId: string;
  price: number;
  status: ResourceStatus;
  moderationStatus: ContentModerationStatus;
  moderationScore?: number | null;
  moderationReasons: string[];
  moderationRuleVersion?: string | null;
  moderatedAt?: Date | null;
  resourceVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  thumbnailUrl?: string | null;
  deletedAt?: Date | null;
  tutorialId?: string | null;
  collectionId?: string | null;
  collection?: ResourceCollectionDetails | null;
  primaryS3Key?: string | null;
  _count: ResourceQueryCount;
  uploader?: UserProfileRpcResponseDto;
  major?: ResourceQueryMajor;
  course?: ResourceQueryCourse;
}

/** Interface representing data constraints for  resource query result. */
export interface ResourceQueryResult {
  data: ResourceQueryItem[];
  meta: ResourceQueryMeta;
}

export interface ContentModerationPersistenceResult {
  status: ContentModerationStatus;
  score?: number | null;
  reasons: string[];
  ruleVersion?: string | null;
}

export interface ResourceUpdateDetails {
  title: string;
  summary: string;
  hightlights: string[];
  majorId: string;
  courseId: string;
  price: number;
  collectionId?: string;
}

/** Interface representing data constraints for  i resource repository. */
export interface IResourceRepository {
  save(resource: Resource): Promise<void>;
  saveMeta(resourceId: string, resourceMeta: ResourceMeta): Promise<void>;
  deleteAllByUserId(userId: string): Promise<void>;
  deleteAllMetaByResourceId(resourceId: string): Promise<void>;
  findById(id: string): Promise<Resource | null>;
  findByIds(ids: string[]): Promise<Resource[]>;
  findBySlug(slug: string): Promise<Resource | null>;
  findMetaById(id: string): Promise<ResourceMeta | null>;
  findMetaByResourceId(resourceId: string): Promise<ResourceMeta[] | null>;
  findByIdWithDetails(id: string): Promise<ResourceQueryItem | null>;
  findByIdsWithDetails(ids: string[]): Promise<ResourceQueryItem[]>;
  findBySlugWithDetails(slug: string): Promise<ResourceQueryItem | null>;
  findAvailableResources(params: ResourceListQueryParams): Promise<ResourceQueryResult>;
  findMyResources(params: ResourceListQueryParams): Promise<ResourceQueryResult>;
  findAvailableResourceCollections(params: ResourceListQueryParams): Promise<ResourceQueryResult>;
  update(resource: Resource): Promise<void>;
  updateDetails(resourceId: string, details: ResourceUpdateDetails): Promise<void>;
  updateMeta(resourceId: string, fileId: string, resourceMeta: ResourceMeta): Promise<void>;
  completeUpload(
    resourceId: string,
    meta: ResourceMeta[],
    options?: { session?: unknown },
  ): Promise<void>;
  applyModerationResult(
    resourceId: string,
    result: ContentModerationPersistenceResult,
    options?: { session?: unknown },
  ): Promise<void>;
  /**
   * Tìm resource dựa trên meta[0].fileId (S3 key) và cập nhật downloadUrl
   * @param fileId - S3 key (meta[0].fileId)
   * @param params - {downloadUrl, fileSize}
   */
  updateByFileId(
    fileId: string,
    params: { downloadUrl?: string; fileSize?: number },
    options?: { session?: unknown },
  ): Promise<void>;
  markFailedByFileId(fileId: string, options?: { session?: unknown }): Promise<void>;
  findUncollectedResources(courseId: string, limit: number): Promise<ResourceQueryItem[]>;
  findTopResources(
    limit: number,
    search?: string,
    semester?: number,
    majorId?: string,
  ): Promise<ResourceQueryItem[]>;
  deletePendingOlderThan(cutoff: Date): Promise<number>;
  delete(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
  deleteMeta(id: string): Promise<void>;
}
