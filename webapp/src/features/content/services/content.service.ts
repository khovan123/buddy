import { cache } from "react"

import { isDynamicServerError } from "next/dist/client/components/hooks-server-context"

import { fetchApi } from "@/lib/fetch"
import { getAuthHeaders } from "@/lib/server-session"

import type {
  ApiResponse,
  Collection,
  CollectionQueryItem,
  ContentListParams,
  PaginatedResult,
  Resource,
  ResourceQueryItem,
  Tutorial,
  TutorialQueryItem,
} from "../types"

type ContentWithId = { id: string }

const getPurchasedContentIds = cache(async (): Promise<Set<string>> => {
  try {
    const res = await fetchApi(
      "GET",
      "/libraries/purchased-ids",
      undefined,
      await getAuthHeaders(),
      false,
      { cache: "no-store" }
    )

    if (!res.ok) {
      return new Set()
    }

    const json = (await res.json()) as ApiResponse<string[]>
    return new Set(json.data ?? [])
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    return new Set()
  }
})

const excludePurchased = async <T extends ContentWithId>(
  items: T[]
): Promise<T[]> => {
  const purchasedIds = await getPurchasedContentIds()
  return items.filter((item) => !purchasedIds.has(item.id))
}

const excludePurchasedPage = async <T extends ContentWithId>(
  result: PaginatedResult<T>
): Promise<PaginatedResult<T>> => {
  const data = await excludePurchased(result.data)
  const hiddenCount = result.data.length - data.length

  return {
    data,
    meta: {
      ...result.meta,
    },
  }
}

// ─────────────────────────────────────────────────────────────
// Server-side Fetch Functions (dùng trong Server Components / RSC)
// Tất cả đều sử dụng ISR cache (revalidate: 60s) thông qua fetchApi
// ─────────────────────────────────────────────────────────────

// ── Tutorials ───────────────────────────────────────────────

/** GET /v1/tutorials — paginated list */
export const getTutorials = async (
  params: ContentListParams = {}
): Promise<PaginatedResult<TutorialQueryItem>> => {
  const qs = new URLSearchParams()
  if (params.page) {
    qs.set("page", String(params.page))
  }
  if (params.limit) {
    qs.set("limit", String(params.limit))
  }
  if (params.search) {
    qs.set("search", params.search)
  }
  if (params.userId) {
    qs.set("userId", params.userId)
  }
  if (params.semester) {
    qs.set("semester", String(params.semester))
  }
  if (params.majorId) {
    qs.set("majorId", params.majorId)
  }

  const queryString = qs.toString()
  const path = `/tutorials${queryString ? "?" + queryString : ""}`

  try {
    const res = await fetchApi(
      "GET",
      path,
      undefined,
      await getAuthHeaders(),
      false,
      {
        next: { revalidate: 60, tags: ["tutorials"] },
      }
    )

    if (!res.ok) {
      return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
    }

    const json = (await res.json()) as ApiResponse<
      PaginatedResult<TutorialQueryItem>
    >
    return excludePurchasedPage(
      json.data ?? {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      }
    )
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch tutorials:", error)
    return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
  }
}

/** GET /v1/tutorials/me — current user's tutorials */
export const getMyTutorials = async (): Promise<
  PaginatedResult<TutorialQueryItem>
> => {
  try {
    const res = await fetchApi(
      "GET",
      `/tutorials/me`,
      undefined,
      await getAuthHeaders(),
      false,
      {
        cache: "no-store",
      }
    )

    if (!res.ok) {
      return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
    }

    const json = (await res.json()) as ApiResponse<
      PaginatedResult<TutorialQueryItem>
    >
    return (
      json.data ?? {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      }
    )
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch my tutorials:", error)
    return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
  }
}

/** GET /v1/tutorials/:slug — single tutorial by slug */
export const getTutorialBySlug = async (
  slug: string
): Promise<TutorialQueryItem | null> => {
  try {
    const res = await fetchApi(
      "GET",
      `/tutorials/${slug}`,
      undefined,
      undefined,
      false,
      { next: { revalidate: 60, tags: ["tutorial", slug] } }
    )

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<TutorialQueryItem>
    return json.data ?? null
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error(`Failed to fetch tutorial ${slug}:`, error)
    return null
  }
}

/** GET /v1/collections/tutorials — paginated list of tutorial collections */
export const getTutorialCollections = async (
  params: ContentListParams = {}
): Promise<PaginatedResult<CollectionQueryItem>> => {
  const qs = new URLSearchParams()
  if (params.page) {
    qs.set("page", String(params.page))
  }
  if (params.limit) {
    qs.set("limit", String(params.limit))
  }
  if (params.search) {
    qs.set("search", params.search)
  }
  if (params.userId) {
    qs.set("userId", params.userId)
  }

  const queryString = qs.toString()
  const path = `/collections/tutorials${queryString ? "?" + queryString : ""}`
  try {
    const res = await fetchApi(
      "GET",
      path,
      undefined,
      await getAuthHeaders(),
      false,
      {
        next: { revalidate: 60, tags: ["tutorial-collections"] },
      }
    )

    if (!res.ok) {
      return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
    }

    const json = (await res.json()) as ApiResponse<
      PaginatedResult<CollectionQueryItem>
    >
    return excludePurchasedPage(
      json.data ?? {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      }
    )
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch tutorial collections:", error)
    return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
  }
}

/** GET /v1/collections/tutorials/me — current user's tutorial collections */
export const getMyTutorialCollections = async (): Promise<
  PaginatedResult<CollectionQueryItem>
> => {
  try {
    const res = await fetchApi(
      "GET",
      `/collections/tutorials/me`,
      undefined,
      await getAuthHeaders(),
      false,
      {
        cache: "no-store",
      }
    )

    if (!res.ok) {
      return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
    }

    const json = (await res.json()) as ApiResponse<
      PaginatedResult<CollectionQueryItem>
    >
    return (
      json.data ?? {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      }
    )
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch my tutorial collections:", error)
    return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
  }
}

/** GET /v1/collections/tutorials/:slug — single tutorial collection by slug */
export const getTutorialCollectionBySlug = async (
  slug: string
): Promise<CollectionQueryItem | null> => {
  try {
    const res = await fetchApi(
      "GET",
      `/collections/tutorials/${slug}`,
      undefined,
      undefined,
      false,
      { next: { revalidate: 60, tags: ["tutorial-collection", slug] } }
    )

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<CollectionQueryItem>
    return json.data ?? null
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error(`Failed to fetch tutorial collection ${slug}:`, error)
    return null
  }
}

// ── Resources ───────────────────────────────────────────────

/** GET /v1/resources — paginated list */
export const getResources = async (
  params: ContentListParams = {}
): Promise<PaginatedResult<ResourceQueryItem>> => {
  const qs = new URLSearchParams()
  if (params.page) {
    qs.set("page", String(params.page))
  }
  if (params.limit) {
    qs.set("limit", String(params.limit))
  }
  if (params.search) {
    qs.set("search", params.search)
  }
  if (params.userId) {
    qs.set("userId", params.userId)
  }
  if (params.semester) {
    qs.set("semester", String(params.semester))
  }
  if (params.majorId) {
    qs.set("majorId", params.majorId)
  }

  const queryString = qs.toString()
  const path = `/resources${queryString ? "?" + queryString : ""}`

  try {
    const res = await fetchApi(
      "GET",
      path,
      undefined,
      await getAuthHeaders(),
      false,
      {
        next: { revalidate: 60, tags: ["resources"] },
      }
    )

    if (!res.ok) {
      return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
    }

    const json = (await res.json()) as ApiResponse<
      PaginatedResult<ResourceQueryItem>
    >
    return excludePurchasedPage(
      json.data ?? {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      }
    )
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch resources:", error)
    return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
  }
}

/** GET /v1/resources/me — current user's resources */
export const getMyResources = async (): Promise<
  PaginatedResult<ResourceQueryItem>
> => {
  try {
    const res = await fetchApi(
      "GET",
      `/resources/me`,
      undefined,
      await getAuthHeaders(),
      false,
      {
        cache: "no-store",
      }
    )

    if (!res.ok) {
      return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
    }

    const json = (await res.json()) as ApiResponse<
      PaginatedResult<ResourceQueryItem>
    >
    return (
      json.data ?? {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      }
    )
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch my resources:", error)
    return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
  }
}

/** GET /v1/resources/:slug — single resource by slug */
export const getResourceBySlug = async (
  slug: string
): Promise<ResourceQueryItem | null> => {
  try {
    const res = await fetchApi(
      "GET",
      `/resources/${slug}`,
      undefined,
      undefined,
      false,
      { next: { revalidate: 60, tags: ["resource", slug] } }
    )

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<ResourceQueryItem>
    return json.data ?? null
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error(`Failed to fetch resource ${slug}:`, error)
    return null
  }
}

/** GET /v1/collections/resources — paginated list of resource collections */
export const getResourceCollections = async (
  params: ContentListParams = {}
): Promise<PaginatedResult<CollectionQueryItem>> => {
  const qs = new URLSearchParams()
  if (params.page) {
    qs.set("page", String(params.page))
  }
  if (params.limit) {
    qs.set("limit", String(params.limit))
  }
  if (params.search) {
    qs.set("search", params.search)
  }
  if (params.userId) {
    qs.set("userId", params.userId)
  }

  const queryString = qs.toString()
  const path = `/collections/resources${queryString ? "?" + queryString : ""}`

  try {
    const res = await fetchApi(
      "GET",
      path,
      undefined,
      await getAuthHeaders(),
      false,
      {
        next: { revalidate: 60, tags: ["resource-collections"] },
      }
    )

    if (!res.ok) {
      return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
    }

    const json = (await res.json()) as ApiResponse<
      PaginatedResult<CollectionQueryItem>
    >
    return excludePurchasedPage(
      json.data ?? {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      }
    )
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch resource collections:", error)
    return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
  }
}

/** GET /v1/collections/resources/me — current user's resource collections */
export const getMyResourceCollections = async (): Promise<
  PaginatedResult<CollectionQueryItem>
> => {
  try {
    const res = await fetchApi(
      "GET",
      `/collections/resources/me`,
      undefined,
      await getAuthHeaders(),
      false,
      {
        cache: "no-store",
      }
    )

    if (!res.ok) {
      return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
    }

    const json = (await res.json()) as ApiResponse<
      PaginatedResult<CollectionQueryItem>
    >
    return (
      json.data ?? {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      }
    )
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch my resource collections:", error)
    return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }
  }
}

/** GET /v1/collections/resources/:slug — single resource collection by slug */
export const getResourceCollectionBySlug = async (
  slug: string
): Promise<CollectionQueryItem | null> => {
  try {
    const res = await fetchApi(
      "GET",
      `/collections/resources/${slug}`,
      undefined,
      undefined,
      false,
      { next: { revalidate: 60, tags: ["resource-collection", slug] } }
    )

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<CollectionQueryItem>
    return json.data ?? null
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error(`Failed to fetch resource collection ${slug}:`, error)
    return null
  }
}

// ── Top K Fetchers (cho Home Page) ──────────────────────────

/** GET /v1/resources/top — top K resources */
export const getTopResources = async (
  limit: number = 6,
  search?: string,
  semester?: number,
  majorId?: string
): Promise<ResourceQueryItem[]> => {
  try {
    const qs = new URLSearchParams()
    qs.set("limit", String(limit))
    if (search) {
      qs.set("search", search)
    }
    if (semester) {
      qs.set("semester", String(semester))
    }
    if (majorId) {
      qs.set("majorId", majorId)
    }

    const res = await fetchApi(
      "GET",
      `/resources/top?${qs.toString()}`,
      undefined,
      await getAuthHeaders(),
      false,
      { next: { revalidate: 60, tags: ["top-resources"] } }
    )

    if (!res.ok) {
      return []
    }

    const json = (await res.json()) as ApiResponse<ResourceQueryItem[]>
    return excludePurchased(json.data ?? [])
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch top resources:", error)
    return []
  }
}

/** GET /v1/tutorials/top — top K tutorials */
export const getTopTutorials = async (
  limit: number = 6,
  search?: string,
  semester?: number,
  majorId?: string
): Promise<TutorialQueryItem[]> => {
  try {
    const qs = new URLSearchParams()
    qs.set("limit", String(limit))
    if (search) {
      qs.set("search", search)
    }
    if (semester) {
      qs.set("semester", String(semester))
    }
    if (majorId) {
      qs.set("majorId", majorId)
    }

    const res = await fetchApi(
      "GET",
      `/tutorials/top?${qs.toString()}`,
      undefined,
      await getAuthHeaders(),
      false,
      { next: { revalidate: 60, tags: ["top-tutorials"] } }
    )

    if (!res.ok) {
      return []
    }

    const json = (await res.json()) as ApiResponse<TutorialQueryItem[]>
    return excludePurchased(json.data ?? [])
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch top tutorials:", error)
    return []
  }
}

/** GET /v1/collections/top?type=RESOURCE — top K resource collections */
export const getTopResourceCollections = async (
  limit: number = 3,
  search?: string,
  semester?: number,
  majorId?: string
): Promise<CollectionQueryItem[]> => {
  try {
    const qs = new URLSearchParams()
    qs.set("limit", String(limit))
    qs.set("type", "RESOURCE")
    if (search) {
      qs.set("search", search)
    }
    if (semester) {
      qs.set("semester", String(semester))
    }
    if (majorId) {
      qs.set("majorId", majorId)
    }

    const res = await fetchApi(
      "GET",
      `/collections/top?${qs.toString()}`,
      undefined,
      await getAuthHeaders(),
      false,
      { next: { revalidate: 60, tags: ["top-resource-collections"] } }
    )

    if (!res.ok) {
      return []
    }

    const json = (await res.json()) as ApiResponse<CollectionQueryItem[]>
    return excludePurchased(json.data ?? [])
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch top resource collections:", error)
    return []
  }
}

/** GET /v1/collections/top?type=TUTORIAL — top K tutorial collections */
export const getTopTutorialCollections = async (
  limit: number = 3,
  search?: string,
  semester?: number,
  majorId?: string
): Promise<CollectionQueryItem[]> => {
  try {
    const qs = new URLSearchParams()
    qs.set("limit", String(limit))
    qs.set("type", "TUTORIAL")
    if (search) {
      qs.set("search", search)
    }
    if (semester) {
      qs.set("semester", String(semester))
    }
    if (majorId) {
      qs.set("majorId", majorId)
    }

    const res = await fetchApi(
      "GET",
      `/collections/top?${qs.toString()}`,
      undefined,
      await getAuthHeaders(),
      false,
      { next: { revalidate: 60, tags: ["top-tutorial-collections"] } }
    )

    if (!res.ok) {
      return []
    }

    const json = (await res.json()) as ApiResponse<CollectionQueryItem[]>
    return excludePurchased(json.data ?? [])
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch top tutorial collections:", error)
    return []
  }
}

// ─────────────────────────────────────────────────────────────
// Library Fetchers — Authenticated user's personal library
// Endpoint: /v1/libraries/*
// ─────────────────────────────────────────────────────────────

const emptyPaginated = <T>(): PaginatedResult<T> => ({
  data: [],
  meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
})

/** GET /v1/libraries/resources — current user's resources */
export const getLibraryResources = async (
  params: ContentListParams = {}
): Promise<PaginatedResult<ResourceQueryItem>> => {
  const qs = new URLSearchParams()
  if (params.page) {
    qs.set("page", String(params.page))
  }
  if (params.limit) {
    qs.set("limit", String(params.limit))
  }
  if (params.search) {
    qs.set("search", params.search)
  }

  const queryString = qs.toString()
  const path = `/libraries/resources${queryString ? "?" + queryString : ""}`

  try {
    const res = await fetchApi(
      "GET",
      path,
      undefined,
      await getAuthHeaders(),
      false,
      {
        cache: "no-store",
        next: { revalidate: 0, tags: ["library-resources"] },
      }
    )

    if (!res.ok) {
      return emptyPaginated()
    }

    const json = (await res.json()) as ApiResponse<
      PaginatedResult<ResourceQueryItem>
    >
    return json.data ?? emptyPaginated()
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch library resources:", error)
    return emptyPaginated()
  }
}

/** GET /v1/libraries/tutorials — current user's tutorials */
export const getLibraryTutorials = async (
  params: ContentListParams = {}
): Promise<PaginatedResult<TutorialQueryItem>> => {
  const qs = new URLSearchParams()
  if (params.page) {
    qs.set("page", String(params.page))
  }
  if (params.limit) {
    qs.set("limit", String(params.limit))
  }
  if (params.search) {
    qs.set("search", params.search)
  }

  const queryString = qs.toString()
  const path = `/libraries/tutorials${queryString ? "?" + queryString : ""}`

  try {
    const res = await fetchApi(
      "GET",
      path,
      undefined,
      await getAuthHeaders(),
      false,
      {
        cache: "no-store",
        next: { revalidate: 0, tags: ["library-tutorials"] },
      }
    )

    if (!res.ok) {
      return emptyPaginated()
    }

    const json = (await res.json()) as ApiResponse<
      PaginatedResult<TutorialQueryItem>
    >
    return json.data ?? emptyPaginated()
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch library tutorials:", error)
    return emptyPaginated()
  }
}

/** GET /v1/libraries/resources/collections — current user's resource collections */
export const getLibraryResourceCollections = async (
  params: ContentListParams = {}
): Promise<PaginatedResult<CollectionQueryItem>> => {
  const qs = new URLSearchParams()
  if (params.page) {
    qs.set("page", String(params.page))
  }
  if (params.limit) {
    qs.set("limit", String(params.limit))
  }
  if (params.search) {
    qs.set("search", params.search)
  }

  const queryString = qs.toString()
  const path = `/libraries/resources/collections${queryString ? "?" + queryString : ""}`

  try {
    const res = await fetchApi(
      "GET",
      path,
      undefined,
      await getAuthHeaders(),
      false,
      {
        cache: "no-store",
        next: { revalidate: 0, tags: ["library-resource-collections"] },
      }
    )

    if (!res.ok) {
      return emptyPaginated()
    }

    const json = (await res.json()) as ApiResponse<
      PaginatedResult<CollectionQueryItem>
    >
    return json.data ?? emptyPaginated()
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch library resource collections:", error)
    return emptyPaginated()
  }
}

/** GET /v1/libraries/tutorials/collections — current user's tutorial collections */
export const getLibraryTutorialCollections = async (
  params: ContentListParams = {}
): Promise<PaginatedResult<CollectionQueryItem>> => {
  const qs = new URLSearchParams()
  if (params.page) {
    qs.set("page", String(params.page))
  }
  if (params.limit) {
    qs.set("limit", String(params.limit))
  }
  if (params.search) {
    qs.set("search", params.search)
  }

  const queryString = qs.toString()
  const path = `/libraries/tutorials/collections${queryString ? "?" + queryString : ""}`

  try {
    const res = await fetchApi(
      "GET",
      path,
      undefined,
      await getAuthHeaders(),
      false,
      {
        cache: "no-store",
        next: { revalidate: 0, tags: ["library-tutorial-collections"] },
      }
    )

    if (!res.ok) {
      return emptyPaginated()
    }

    const json = (await res.json()) as ApiResponse<
      PaginatedResult<CollectionQueryItem>
    >
    return json.data ?? emptyPaginated()
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch library tutorial collections:", error)
    return emptyPaginated()
  }
}

// ── Library Detail Fetchers (by slug) ───────────────────────

/** GET /v1/libraries/resources/:slug — single library resource (full entity with meta) */
export const getLibraryResourceBySlug = async (
  slug: string
): Promise<Resource | null> => {
  try {
    const res = await fetchApi(
      "GET",
      `/libraries/resources/${slug}`,
      undefined,
      await getAuthHeaders(),
      false,
      {
        cache: "no-store",
        next: { revalidate: 0, tags: ["library-resource", slug] },
      }
    )

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<Resource>
    return json.data ?? null
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error(`Failed to fetch library resource ${slug}:`, error)
    return null
  }
}

/** GET /v1/libraries/tutorials/:slug — single library tutorial (full entity with media) */
export const getLibraryTutorialBySlug = async (
  slug: string
): Promise<Tutorial | null> => {
  try {
    const res = await fetchApi(
      "GET",
      `/libraries/tutorials/${slug}`,
      undefined,
      await getAuthHeaders(),
      false,
      {
        cache: "no-store",
        next: { revalidate: 0, tags: ["library-tutorial", slug] },
      }
    )

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<Tutorial>
    return json.data ?? null
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error(`Failed to fetch library tutorial ${slug}:`, error)
    return null
  }
}

/** GET /v1/libraries/resources/collections/:slug — single library collection (full entity) */
export const getLibraryResourceCollectionBySlug = async (
  slug: string
): Promise<Collection | null> => {
  try {
    const res = await fetchApi(
      "GET",
      `/libraries/resources/collections/${slug}`,
      undefined,
      await getAuthHeaders(),
      false,
      {
        cache: "no-store",
        next: { revalidate: 0, tags: ["library-resource-collection", slug] },
      }
    )

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<Collection>
    return json.data ?? null
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error(`Failed to fetch library resource collection ${slug}:`, error)
    return null
  }
}

/** GET /v1/libraries/tutorials/collections/:slug — single library collection (full entity) */
export const getLibraryTutorialCollectionBySlug = async (
  slug: string
): Promise<Collection | null> => {
  try {
    const res = await fetchApi(
      "GET",
      `/libraries/tutorials/collections/${slug}`,
      undefined,
      await getAuthHeaders(),
      false,
      {
        cache: "no-store",
        next: { revalidate: 0, tags: ["library-tutorial-collection", slug] },
      }
    )

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<Collection>
    return json.data ?? null
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error(`Failed to fetch library tutorial collection ${slug}:`, error)
    return null
  }
}

// ── Content Metadata (server-side) ──────────────────────────

/** GET /v1/content-meta — majors + courses for server components */
export const getContentMeta = async (): Promise<{
  majors: import("../types").Major[]
  courses: import("../types").Course[]
}> => {
  const empty = { majors: [], courses: [] }

  try {
    const res = await fetchApi(
      "GET",
      `/content-meta`,
      undefined,
      undefined,
      false,
      { next: { revalidate: 300, tags: ["content-meta"] } }
    )

    if (!res.ok) {
      return empty
    }

    const json = (await res.json()) as ApiResponse<{
      majors: import("../types").Major[]
      courses: import("../types").Course[]
    }>
    return json.data ?? empty
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch content meta:", error)
    return empty
  }
}

// ── Resource Preview ─────────────────────────────────────────

export interface ResourcePreviewResponse {
  previewUrl: string | null
  isReady: boolean
  isPreview: boolean
  previewPercentage: number
  status: "AVAILABLE" | "PROCESSING" | "FAILED" | "UNSUPPORTED"
  resourceTitle: string
  resourceSlug: string
  format: string
}

/** GET /v1/resources/:slug/preview — get document preview URL */
export const getResourcePreview = async (
  slug: string
): Promise<ResourcePreviewResponse | null> => {
  try {
    const res = await fetchApi(
      "GET",
      `/resources/${slug}/preview`,
      undefined,
      undefined,
      true,
      { cache: "no-store", next: { revalidate: 0 } }
    )

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<ResourcePreviewResponse>
    return json.data ?? null
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error(`Failed to fetch resource preview ${slug}:`, error)
    return null
  }
}

// ── Recommendation & Trending ────────────────────────────────

/** GET /v1/recommendations — get personalized recommendations */
export const getRecommendations = async (
  userId?: string,
  limit: number = 6,
  contentType?: string
): Promise<import("../types").RecommendationResponse | null> => {
  try {
    const qs = new URLSearchParams()
    if (userId) {
      qs.set("userId", userId)
    }
    if (limit) {
      qs.set("limit", String(limit))
    }
    if (contentType) {
      qs.set("contentType", contentType)
    }

    const res = await fetchApi(
      "GET",
      `/recommendations?${qs.toString()}`,
      undefined,
      await getAuthHeaders(),
      false,
      { next: { revalidate: 60, tags: ["recommendations"] } }
    )

    if (!res.ok) {
      return null
    }

    const json = await res.json()
    return json as import("../types").RecommendationResponse
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch recommendations:", error)
    return null
  }
}

/** GET /v1/recommendations/trending — get global trending content */
export const getTrending = async (
  majorId?: string,
  days?: number,
  limit: number = 6
): Promise<import("../types").TrendingResponse | null> => {
  try {
    const qs = new URLSearchParams()
    if (majorId) {
      qs.set("majorId", majorId)
    }
    if (days) {
      qs.set("days", String(days))
    }
    if (limit) {
      qs.set("limit", String(limit))
    }

    const res = await fetchApi(
      "GET",
      `/recommendations/trending?${qs.toString()}`,
      undefined,
      await getAuthHeaders(),
      false,
      { next: { revalidate: 60, tags: ["trending"] } }
    )

    if (!res.ok) {
      return null
    }

    const json = await res.json()
    return json as import("../types").TrendingResponse
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch trending content:", error)
    return null
  }
}
