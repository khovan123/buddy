import { getClientAuthHeaders } from "@/lib/client-session"
import { fetchApi } from "@/lib/fetch"

import type {
  CollectionQueryItem,
  ResourceQueryItem,
  TutorialQueryItem,
} from "../types"

/** Fetch resources by courseId that are NOT in any collection — uses backend filtering */
export const fetchResourcesByCourse = async (
  courseId: string
): Promise<ResourceQueryItem[]> => {
  try {
    const res = await fetchApi(
      "GET",
      `/resources/uncollected?courseId=${courseId}&limit=100`,
      undefined,
      await getClientAuthHeaders(),
      true,
      { cache: "no-store" }
    )

    if (!res.ok) {
      throw new Error(`Failed with status: ${res.status}`)
    }

    const json = await res.json()
    return json.data ?? []
  } catch (error) {
    console.error(`Failed to fetch resources for course ${courseId}:`, error)
    return []
  }
}

/** Fetch tutorials by courseId that are NOT in any collection — uses backend filtering */
export const fetchTutorialsByCourse = async (
  courseId: string
): Promise<TutorialQueryItem[]> => {
  try {
    const res = await fetchApi(
      "GET",
      `/tutorials/uncollected?courseId=${courseId}&limit=100`,
      undefined,
      await getClientAuthHeaders(),
      true,
      { cache: "no-store" }
    )

    if (!res.ok) {
      throw new Error(`Failed with status: ${res.status}`)
    }

    const json = await res.json()
    return json.data ?? []
  } catch (error) {
    console.error(`Failed to fetch tutorials for course ${courseId}:`, error)
    return []
  }
}

/** Fetch TUTORIAL collections by courseId — for Tutorial Collection (Roadmap) builders */
export const fetchCollectionsByCourse = async (
  courseId: string
): Promise<CollectionQueryItem[]> => {
  try {
    const res = await fetchApi(
      "GET",
      `/collections?courseId=${courseId}&type=TUTORIAL&limit=100`,
      undefined,
      await getClientAuthHeaders(),
      true,
      { cache: "no-store" }
    )

    if (!res.ok) {
      throw new Error(`Failed with status: ${res.status}`)
    }

    const json = await res.json()
    return json.data?.data ?? []
  } catch (error) {
    console.error(`Failed to fetch collections for course ${courseId}:`, error)
    return []
  }
}

/**
 * Fetch RESOURCE collections by courseId.
 * Used by the Tutorial Builder's "Pick from Collections" mode
 * to let users attach an existing Resource Collection to a Tutorial.
 */
export const fetchResourceCollectionsByCourse = async (
  courseId: string
): Promise<CollectionQueryItem[]> => {
  try {
    const res = await fetchApi(
      "GET",
      `/collections?courseId=${courseId}&type=RESOURCE&limit=100`,
      undefined,
      await getClientAuthHeaders(),
      true,
      { cache: "no-store" }
    )

    if (!res.ok) {
      throw new Error(`Failed with status: ${res.status}`)
    }

    const json = await res.json()
    return json.data?.data ?? []
  } catch (error) {
    console.error(
      `Failed to fetch resource collections for course ${courseId}:`,
      error
    )
    return []
  }
}
