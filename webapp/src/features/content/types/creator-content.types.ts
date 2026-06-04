export type UploadFileStatus = "PENDING" | "PROCESSING" | "AVAILABLE" | "FAILED"

export interface UploadHistoryItem {
  id: string
  originalFilename: string
  mimeType: string
  s3Key: string
  bucket: string
  fileSizeBytes: number
  uploadedBy: string
  status: UploadFileStatus
  contentId: string | null
  contentType: string | null
  streamingUrl: string | null
  trailerUrl: string | null
  downloadUrl: string | null
  processingError: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface UploadHistoryMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface UploadHistoryResponse {
  data: UploadHistoryItem[]
  meta: UploadHistoryMeta
}

export interface ContentResourceItem {
  id: string
  userId: string
  title: string
  slug: string
  summary: string
  hightlights: string[]
  majorId: string
  courseId: string
  price: number
  status: string
  moderationStatus?: string
  moderationScore?: number | null
  moderationReasons?: string[]
  moderationRuleVersion?: string | null
  moderatedAt?: string | null
  resourceVerified: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface ContentTutorialItem {
  id: string
  userId: string
  title: string
  slug: string
  description: string
  hightlights: string[]
  majorId: string
  courseId: string
  price: number
  status: string
  moderationStatus?: string
  moderationScore?: number | null
  moderationReasons?: string[]
  moderationRuleVersion?: string | null
  moderatedAt?: string | null
  isVerified: boolean
  discountBundle: number
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  media?: {
    fileId?: string
    videoUrl?: string | null
    streamingUrl?: string | null
    trailerUrl?: string | null
    duration?: number | null
    fileSize?: number
    extension?: string
  } | null
}

export interface ResourceUploadHistoryEntry {
  resource: ContentResourceItem
  uploadHistory: UploadHistoryItem[]
}

export interface TutorialUploadHistoryEntry {
  tutorial: ContentTutorialItem
  uploadHistory: UploadHistoryItem[]
}
