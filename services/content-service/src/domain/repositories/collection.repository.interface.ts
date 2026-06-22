import {
  CollectionPhaseItemType,
  CollectionStatus,
  CollectionType,
} from '../../infrastructure/persistence/mongo/schemas/collection.schema';
import { Collection } from '../entities/collection.entity';

/** Interface representing data constraints for  collection list query params. */
export interface CollectionListQueryParams {
  page: number;
  limit: number;
  search?: string;
  userId?: string;
  type?: CollectionType;
}

/** Interface representing data constraints for  collection query meta. */
export interface CollectionQueryMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Interface representing data constraints for  collection query count. */
export interface CollectionQueryCount {
  tutorials: number;
  resources: number;
}

import { UserProfileRpcResponseDto } from '@libs/contracts';

import { CourseStatus } from '../entities/course.entity';
import { MajorStatus } from '../entities/major.entity';

export interface CollectionQueryMajor {
  id: string;
  code: string;
  name: string;
  description: string;
  status: MajorStatus;
}

export interface CollectionQueryCourse {
  id: string;
  code: string;
  name: string;
  credits: number;
  semester: number;
  isCompulsory: boolean;
  status: CourseStatus;
}

/** Interface for phase items in the query response */
export interface CollectionQueryPhaseItem {
  itemId: string;
  itemType: string;
}

/** Interface for phases in the query response */
export interface CollectionQueryPhase {
  phaseTitle: string;
  learningGoal: string;
  items: CollectionQueryPhaseItem[];
}

/** Interface representing data constraints for  collection query item. */
export interface CollectionQueryItem {
  id: string;
  userId: string;
  title: string;
  slug: string;
  description: string;
  hightlights: string[];
  majorId: string;
  courseId: string;
  type: CollectionType;
  discount: number;
  originalPrice: number;
  discountedPrice: number;
  status: CollectionStatus;
  createdAt: Date;
  updatedAt: Date;
  thumbnailUrl?: string | null;
  deletedAt?: Date | null;
  _count: CollectionQueryCount;
  uploader?: UserProfileRpcResponseDto;
  major?: CollectionQueryMajor;
  course?: CollectionQueryCourse;
  phases?: CollectionQueryPhase[];
}

/** Interface representing data constraints for  collection query result. */
export interface CollectionQueryResult {
  data: CollectionQueryItem[];
  meta: CollectionQueryMeta;
}

export interface CollectionUpdateDetails {
  title: string;
  description: string;
  hightlights: string[];
  majorId: string;
  courseId: string;
  type: CollectionType;
  discount: number;
  phases?: Array<{
    phaseTitle: string;
    learningGoal: string;
    items: Array<{ itemId: string; itemType: CollectionPhaseItemType }>;
  }>;
}

/** Interface representing data constraints for  i collection repository. */
export interface ICollectionRepository {
  save(collection: Collection): Promise<void>;
  deleteAllByUserId(userId: string): Promise<void>;
  findById(id: string): Promise<Collection | null>;
  findByIds(ids: string[]): Promise<Collection[]>;
  findBySlug(slug: string): Promise<Collection | null>;
  findByTitle(title: string): Promise<Collection | null>;
  findByIdWithType(id: string, type: CollectionType): Promise<Collection | null>;
  findByIdWithDetails(id: string): Promise<CollectionQueryItem | null>;
  findByIdsWithDetails(ids: string[]): Promise<CollectionQueryItem[]>;
  findBySlugWithDetails(slug: string): Promise<CollectionQueryItem | null>;
  findAvailableCollections(params: CollectionListQueryParams): Promise<CollectionQueryResult>;
  findTopCollections(
    limit: number,
    type: CollectionType,
    search?: string,
    semester?: number,
    majorId?: string,
  ): Promise<CollectionQueryItem[]>;
  update(collection: Collection): Promise<void>;
  updateDetails(collectionId: string, details: CollectionUpdateDetails): Promise<void>;
  delete(id: string): Promise<void>;
}
