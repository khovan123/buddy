import { CareerItem, SkillItem } from "@/types/shared"

export type { ApiResponse, PaginatedResult, PaginationMeta } from "@/types/api"
export type * from "./creator-content.types"

// ─────────────────────────────────────────────────────────────
// Content Service Types — khớp chính xác với Backend Schema
// Source of truth:
//   - Schemas:  content-service/src/infrastructure/persistence/mongo/schemas/
//   - Queries:  content-service/src/domain/repositories/*.repository.interface.ts
//   - Commands: content-service/src/application/commands/
//   - DTOs:     content-service/src/presentation/http/dtos/
// ─────────────────────────────────────────────────────────────

// ── Enums (khớp với backend enum declarations) ──────────────

/** major.schema.ts → MajorStatus */
export enum MajorStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  DELETED = "DELETED",
}

/** course.schema.ts → CourseStatus */
export enum CourseStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  HIDDEN = "HIDDEN",
  DELETED = "DELETED",
}

/** resource.schema.ts → ResourceStatus */
export enum ResourceStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  AVAILABLE = "AVAILABLE",
  FAILED = "FAILED",
  BANNED = "BANNED",
  DELETED = "DELETED",
}

/** tutorial.schema.ts → TutorialStatus */
export enum TutorialStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  AVAILABLE = "AVAILABLE",
  FAILED = "FAILED",
  BANNED = "BANNED",
  DELETED = "DELETED",
}

export enum ContentModerationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  NEEDS_REVIEW = "NEEDS_REVIEW",
  ERROR = "ERROR",
}

/** collection.schema.ts → CollectionType */
export enum CollectionType {
  RESOURCE = "RESOURCE",
  TUTORIAL = "TUTORIAL",
}

/** collection.schema.ts → CollectionStatus */
export enum CollectionStatus {
  AVAILABLE = "AVAILABLE",
  BANNED = "BANNED",
  DELETED = "DELETED",
}

// ── Major (major.schema.ts) ─────────────────────────────────

export interface Major {
  id: string
  code: string
  name: string
  description: string
  status: MajorStatus
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

// ── Course (course.schema.ts) ───────────────────────────────

export interface Course {
  id: string
  code: string
  name: string
  credits: number
  semester: number
  isCompulsory: boolean
  majorId: string
  prerequisiteCourseIds: string[]
  status: CourseStatus
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  // Virtuals (populated)
  major?: Major
  prerequisiteCourses?: Course[]
}

// ── Resource (resource.schema.ts) ───────────────────────────

/** resource.schema.ts → ResourceMeta (embedded sub-document) */
export interface ResourceMeta {
  fileId: string
  downloadUrl: string
  fileSize: number
  extension: string
}

/** resource.schema.ts → Resource (main document) */
export interface Resource {
  _id: string
  userId: string
  title: string
  slug: string
  summary: string
  hightlights: string[]
  majorId: string
  courseId: string
  price: number
  status: ResourceStatus
  moderationStatus?: ContentModerationStatus
  moderationScore?: number | null
  moderationReasons?: string[]
  moderationRuleVersion?: string | null
  moderatedAt?: string | null
  isVerified: boolean
  tutorialId?: string | null
  collectionId?: string | null
  meta: ResourceMeta[]
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  // Virtuals (populated)
  major?: Major
  course?: Course
}

// ── Resource Query Types (resource.repository.interface.ts) ─

/** Populated collection details within a ResourceQueryItem */
export interface ResourceCollectionDetails {
  _id: string
  userId: string
  title: string
  description: string
  hightlights: string[]
  type: string
  discount: number
  status: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

/** Uploader Profile Information mapping from user-service */
export interface UserProfileRpcResponse {
  id: string
  nickname: string
  email: string
  phone?: string
  bio?: string
  avatarUrl?: string
  dateOfBirth?: Date
  majorId?: string
  semester?: number
  career?: Pick<CareerItem, "id" | "name">
  skills?: Pick<SkillItem, "id" | "name">[]
}

/** Aggregated counts for ResourceQueryItem */
export interface ResourceQueryCount {
  resourceMeta: number
  resourceOrders: number
}

/** resource.repository.interface.ts → ResourceQueryItem */
export interface ResourceQueryItem {
  id: string
  userId: string
  title: string
  slug: string
  summary: string
  hightlights: string[]
  majorId: string
  courseId: string
  price: number
  status: ResourceStatus
  moderationStatus?: ContentModerationStatus
  moderationScore?: number | null
  moderationReasons?: string[]
  moderationRuleVersion?: string | null
  moderatedAt?: string | null
  isVerified: boolean
  createdAt: string
  updatedAt: string
  thumbnailUrl?: string
  deletedAt?: string | null
  tutorialId?: string | null
  collectionId?: string | null
  collection?: ResourceCollectionDetails | null
  _count: ResourceQueryCount
  uploader?: UserProfileRpcResponse
  major?: CollectionQueryMajor
  course?: CollectionQueryCourse
}

// ── Tutorial (tutorial.schema.ts) ───────────────────────────

/** tutorial.schema.ts → MediaMeta (embedded sub-document) */
export interface TutorialMedia {
  fileId: string
  videoUrl: string
  streamingUrl?: string | null
  trailerUrl?: string | null
  duration: number
  fileSize: number
  extension: string
}

/** tutorial.schema.ts → Tutorial (main document) */
export interface Tutorial {
  _id: string
  userId: string
  title: string
  slug: string
  description: string
  hightlights: string[]
  majorId: string
  courseId: string
  media: TutorialMedia
  price: number
  isVerified: boolean
  status: TutorialStatus
  moderationStatus?: ContentModerationStatus
  moderationScore?: number | null
  moderationReasons?: string[]
  moderationRuleVersion?: string | null
  moderatedAt?: string | null
  discountBundle: number
  collectionId?: string | null
  resourceIds?: string[] | null
  collectionIds?: string[]
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  // Virtuals (populated)
  major?: Major
  course?: Course
}

// ── Tutorial Query Types (tutorial.repository.interface.ts) ─

/** Populated collection details within a TutorialQueryItem */
export interface TutorialCollectionDetails {
  _id: string
  userId: string
  title: string
  description: string
  hightlights: string[]
  type: string
  discount: number
  status: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

/** Populated resource details within a TutorialQueryItem */
export interface TutorialResourceDetails {
  _id: string
  userId: string
  title: string
  slug: string
  summary: string
  hightlights: string[]
  price: number
  status: string
  resourceVerified: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

/** Aggregated counts for TutorialQueryItem */
export interface TutorialQueryCount {
  tutorialMedia: number
  tutorialOrders: number
}

/** tutorial.repository.interface.ts → TutorialQueryItem */
export interface TutorialQueryItem {
  id: string
  userId: string
  title: string
  slug: string
  description: string
  hightlights: string[]
  majorId: string
  courseId: string
  price: number
  status: TutorialStatus
  moderationStatus?: ContentModerationStatus
  moderationScore?: number | null
  moderationReasons?: string[]
  moderationRuleVersion?: string | null
  moderatedAt?: string | null
  isVerified: boolean
  discountBundle: number
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  collectionId?: string | null
  collection?: TutorialCollectionDetails | null
  resourceIds?: string[] | null
  resources?: TutorialResourceDetails[] | null
  collectionIds?: string[] | null
  thumbnailUrl?: string
  trailerUrl?: string
  steps?: Array<{
    title: string
    resources: Array<{
      resourceId: string
      instructionNote: string
      resource?: {
        id: string
        slug: string
        title: string
        summary: string
      }
    }>
  }>
  _count: TutorialQueryCount
  uploader?: UserProfileRpcResponse
  major?: CollectionQueryMajor
  course?: CollectionQueryCourse
}

// ── Collection Phase Types ──────────────────────────────────

export type CollectionPhaseItemType = "RESOURCE" | "TUTORIAL"

export interface CollectionPhaseItem {
  itemId: string
  itemType: CollectionPhaseItemType
}

export interface CollectionPhase {
  phaseTitle: string
  learningGoal: string
  items: CollectionPhaseItem[]
}

// ── Collection (collection.schema.ts) ───────────────────────

/** collection.schema.ts → Collection (main document) */
export interface Collection {
  _id: string
  userId: string
  title: string
  slug: string
  description: string
  hightlights: string[]
  majorId: string
  courseId: string
  resourceIds: string[]
  type: CollectionType
  discount: number
  status: CollectionStatus
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  phases?: CollectionPhase[]
  // Virtuals (populated)
  major?: Major
  course?: Course
}

// ── Collection Query Types (collection.repository.interface.ts)

/** Aggregated counts for CollectionQueryItem */
export interface CollectionQueryCount {
  tutorials: number
  resources: number
}

export interface CollectionQueryMajor {
  id: string
  code: string
  name: string
  description: string
  status: MajorStatus
}

export interface CollectionQueryCourse {
  id: string
  code: string
  name: string
  credits: number
  semester: number
  isCompulsory: boolean
  status: CourseStatus
}

/** collection.repository.interface.ts → CollectionQueryItem */
export interface CollectionQueryItem {
  id: string
  userId: string
  title: string
  slug: string
  description: string
  hightlights: string[]
  majorId: string
  courseId: string
  type: CollectionType
  discount: number
  status: CollectionStatus
  createdAt: string
  updatedAt: string
  thumbnailUrl?: string
  deletedAt?: string | null
  _count: CollectionQueryCount
  uploader?: UserProfileRpcResponse
  phases?: CollectionPhase[]
  major?: CollectionQueryMajor
  course?: CollectionQueryCourse
}

// ── Command / DTO Payloads (khớp DTOs trong presentation) ───

/** create-tutorial.dto.ts → CreateTutorialDto (client gửi lên) */
export interface CreateTutorialPayload {
  title: string
  description: string
  hightlights: string[]
  majorId: string
  courseId: string
  price: number
  discountBundle: number
  fileName: string
  fileSizeBytes: number
  videoDurationSeconds: number
  resourceIds?: string[]
  collectionId?: string
  collectionIds?: string[]
}

/** create-resource.dto.ts → CreateResourceFileDto */
export interface CreateResourceFilePayload {
  fileName: string
  fileSizeBytes: number
  mimeType?: string
}

/** create-resource.dto.ts → CreateResourceDto (client gửi lên) */
export interface CreateResourcePayload {
  title: string
  summary: string
  hightlights: string[]
  majorId: string
  courseId: string
  price: number
  files: CreateResourceFilePayload[]
  collectionId?: string
}

export interface CreateCollectionPayload {
  title: string
  description: string
  hightlights: string[]
  majorId: string
  courseId: string
  resourceIds?: string[]
  tutorialIds?: string[]
  type: CollectionType
  discount: number
}

// ── Major & Course Admin Payloads ───────────────────────────

export interface CreateMajorPayload {
  code: string
  name: string
  description: string
}

export interface UpdateMajorPayload {
  code?: string
  name?: string
  description?: string
  status?: MajorStatus
}

export interface CreateCoursePayload {
  code: string
  name: string
  credits: number
  semester: number
  isCompulsory?: boolean
  majorId: string
  prerequisiteCourseIds?: string[]
}

export interface UpdateCoursePayload {
  code?: string
  name?: string
  credits?: number
  semester?: number
  isCompulsory?: boolean
  majorId?: string
  prerequisiteCourseIds?: string[]
  status?: CourseStatus
}

// ── Create Tutorial Response ────────────────────────────────

export interface CreateTutorialResponse {
  id: string
  userId: string
  title: string
  slug: string
  description: string
  majorId: string
  courseId: string
  price: number
  status: TutorialStatus
  createdAt: string
  fileId: string
  s3Key: string
  uploadUrl: string
  estimatedTime: number
  fileName: string
  fileSizeBytes: number
}

// ── Create Resource Response ────────────────────────────────

/** Presigned URL item for each file in a resource upload */
export interface PresignedUrlItem {
  fileId: string
  s3Key: string
  uploadUrl: string
  estimatedTime: number
  fileName: string
  fileSizeBytes: number
  mimeType?: string
}

/** Response shape from POST /v1/resources — matches create-resource.handler.ts */
export interface CreateResourceResponse {
  resourceId: string
  slug: string
  majorId: string
  courseId: string
  status: ResourceStatus
  uploadUrls: PresignedUrlItem[]
}

// ── Query Params (khớp query.ts DTO) ────────────────────────

export interface ContentListParams {
  page?: number
  limit?: number
  search?: string
  userId?: string
  semester?: number
  majorId?: string
}

// ── Recommendation & Trending ───────────────────────────────

export interface RecommendationItem {
  itemId: string
  itemType: "RESOURCE" | "TUTORIAL" | "RESOURCE_COLLECTION" | "TUTORIAL_COLLECTION" | "COLLECTION"
  score: number
  reasons: string[]
  display?: {
    title?: string
    slug?: string
    itemType?: string
    majorId?: string
    courseId?: string
  } | null
  content: (ResourceQueryItem | TutorialQueryItem | CollectionQueryItem) | null
}

export interface RecommendationResponse {
  userId: string
  strategy: string
  interactionCount: number
  phase: string
  recommendations: RecommendationItem[]
}

export interface TrendingItem {
  itemId: string
  itemType: "RESOURCE" | "TUTORIAL" | "RESOURCE_COLLECTION" | "TUTORIAL_COLLECTION" | "COLLECTION"
  totalInteractions: number
  avgRating: number
  display?: {
    title?: string
    slug?: string
    itemType?: string
    majorId?: string
    courseId?: string
  } | null
  content: (ResourceQueryItem | TutorialQueryItem | CollectionQueryItem) | null
}

export interface TrendingResponse {
  majorId: string | null
  period: string
  items: TrendingItem[]
}
