import { fetchApi } from "@/lib/fetch"
import { getAuthHeaders } from "@/lib/server-session"
import { ApiResponse, PaginatedResult } from "@/types/api"

import { CareerItem, ContentMetaResponse, Course, SkillItem } from "../types"

// ── Upload History Types ─────────────────────────────────────

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

// ── Content Item Types (from backend QueryItem shapes) ──────

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

export const getContentMeta = async (): Promise<ContentMetaResponse | null> => {
  try {
    const res = await fetchApi(
      "GET",
      `/content-meta`,
      undefined,
      undefined,
      false,
      { next: { revalidate: 60, tags: ["content-meta"] } }
    )

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<ContentMetaResponse>
    return json.data ?? null
  } catch (error) {
    console.error(`Failed to fetch content meta:`, error)
    return null
  }
}

export const getCoursesByMajor = async (
  majorId: string
): Promise<Course[] | null> => {
  try {
    const res = await fetchApi(
      "GET",
      `/content-meta/courses?majorId=${majorId}`,
      undefined,
      undefined,
      false,
      { next: { revalidate: 60, tags: ["course", majorId] } }
    )

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<Course[]>
    return json.data ?? null
  } catch (error) {
    console.error(`Failed to fetch course by major(${majorId}):`, error)
    return null
  }
}

export const getCareers = async (): Promise<CareerItem[] | null> => {
  try {
    const res = await fetchApi(
      "GET",
      `/profile-metadata/careers`,
      undefined,
      undefined,
      false,
      {
        next: { revalidate: 60, tags: ["career"] },
      }
    )

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<PaginatedResult<CareerItem>>
    return json.data?.data ?? null
  } catch (error) {
    console.error(`Failed to fetch career:`, error)
    return null
  }
}

export const getSkills = async (): Promise<SkillItem[] | null> => {
  try {
    const res = await fetchApi(
      "GET",
      `/profile-metadata/skills`,
      undefined,
      undefined,
      false,
      {
        next: { revalidate: 60, tags: ["skill"] },
      }
    )

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<PaginatedResult<SkillItem>>
    return json.data?.data ?? null
  } catch (error) {
    console.error(`Failed to fetch skill:`, error)
    return null
  }
}

export const createCareer = async (data: {
  name: string
  description: string
}) => {
  try {
    const res = await fetchApi("POST", `/profile-metadata/careers`, data)
    return res.ok
  } catch (error) {
    console.error("Failed to create career:", error)
    return false
  }
}

export const updateCareer = async (
  id: string,
  data: { name?: string; description?: string; status?: string }
) => {
  try {
    const res = await fetchApi("PUT", `/profile-metadata/careers/${id}`, data)
    return res.ok
  } catch (error) {
    console.error(`Failed to update career(${id}):`, error)
    return false
  }
}

export const deleteCareer = async (id: string) => {
  try {
    const res = await fetchApi("DELETE", `/profile-metadata/careers/${id}`)
    return res.ok
  } catch (error) {
    console.error(`Failed to delete career(${id}):`, error)
    return false
  }
}

export const createSkill = async (data: { name: string; careerId: string }) => {
  try {
    const res = await fetchApi("POST", `/profile-metadata/skills`, data)
    return res.ok
  } catch (error) {
    console.error("Failed to create skill:", error)
    return false
  }
}

export const updateSkill = async (
  id: string,
  data: { name?: string; careerId?: string; status?: string }
) => {
  try {
    const res = await fetchApi("PUT", `/profile-metadata/skills/${id}`, data)
    return res.ok
  } catch (error) {
    console.error(`Failed to update skill(${id}):`, error)
    return false
  }
}

export const deleteSkill = async (id: string) => {
  try {
    const res = await fetchApi("DELETE", `/profile-metadata/skills/${id}`)
    return res.ok
  } catch (error) {
    console.error(`Failed to delete skill(${id}):`, error)
    return false
  }
}

// ── Resource and Tutorial API calls ──────────────
//   page?: number
//   limit?: number
//   status?: UploadFileStatus
// }): Promise<UploadHistoryResponse | null> => {
//   try {
//     const searchParams = new URLSearchParams()
//     if (params?.page) {
//       searchParams.set("page", String(params.page))
//     }
//     if (params?.limit) {
//       searchParams.set("limit", String(params.limit))
//     }
//     if (params?.status) {
//       searchParams.set("status", params.status)
//     }

//     const query = searchParams.toString()
//     const path = `/uploads/history${query ? `?${query}` : ""}`

//     const res = await fetchApi("GET", path)

//     if (!res.ok) {
//       return null
//     }

//     const json = (await res.json()) as ApiResponse<UploadHistoryResponse>
//     return json.data ?? null
//   } catch (error) {
//     console.error("Failed to fetch upload history:", error)
//     return null
//   }
// }

export const getMyResources = async (): Promise<
  ContentResourceItem[] | null
> => {
  try {
    const res = await fetchApi(
      "GET",
      `/resources/me`,
      undefined,
      await getAuthHeaders(),
      true
    )

    if (!res.ok) {
      return null
    }
    const json = (await res.json()) as ApiResponse<
      PaginatedResult<ContentResourceItem>
    >

    return json.data?.data ?? null
  } catch (error) {
    console.error(`Failed to fetch my resources:`, error)
    return null
  }
}

export const getMyTutorials = async (): Promise<
  ContentTutorialItem[] | null
> => {
  try {
    const res = await fetchApi(
      "GET",
      `/tutorials/me`,
      undefined,
      await getAuthHeaders(),
      true
    )
    if (!res.ok) {
      return null
    }
    const json = (await res.json()) as ApiResponse<
      PaginatedResult<ContentTutorialItem>
    >
    return json.data?.data ?? null
  } catch (error) {
    console.error(`Failed to fetch my tutorials:`, error)
    return null
  }
}
