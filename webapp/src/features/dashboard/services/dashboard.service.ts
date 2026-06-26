import type {
  ContentResourceItem,
  ContentTutorialItem,
} from "@/features/content/types"
import { fetchApi } from "@/lib/fetch"
import { getAuthHeaders } from "@/lib/server-session"
import { ApiResponse, PaginatedResult } from "@/types/api"

import { CareerItem, ContentMetaResponse, Course, SkillItem } from "../types"

export type {
  ContentResourceItem,
  ContentTutorialItem,
  ResourceUploadHistoryEntry,
  TutorialUploadHistoryEntry,
  UploadHistoryItem,
  UploadHistoryMeta,
  UploadHistoryResponse,
} from "@/features/content/types"

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

export const getCareers = async (
  page = 1,
  limit = 20
): Promise<PaginatedResult<CareerItem> | null> => {
  try {
    const res = await fetchApi(
      "GET",
      `/profile-metadata/careers?page=${page}&limit=${limit}`,
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
    return json.data ?? null
  } catch (error) {
    console.error(`Failed to fetch career:`, error)
    return null
  }
}

export const getSkills = async (
  page = 1,
  limit = 20
): Promise<PaginatedResult<SkillItem> | null> => {
  try {
    const res = await fetchApi(
      "GET",
      `/profile-metadata/skills?page=${page}&limit=${limit}`,
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
    return json.data ?? null
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
