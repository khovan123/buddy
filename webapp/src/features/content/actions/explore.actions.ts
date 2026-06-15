"use server"

import type { PaginatedResult } from "@/types/api"

import {
  getResourceCollections,
  getResources,
  getTutorialCollections,
  getTutorials,
} from "../services/content.service"
import type {
  CollectionQueryItem,
  ContentListParams,
  ResourceQueryItem,
  TutorialQueryItem,
} from "../types"

// ── Load-more server actions for explore pages ─────────────

export async function fetchMoreTutorials(
  page: number,
  limit: number,
  filters?: Pick<
    ContentListParams,
    "semester" | "majorId" | "search" | "price" | "verified" | "sort"
  >
): Promise<PaginatedResult<TutorialQueryItem>> {
  return getTutorials({ page, limit, ...filters })
}

export async function fetchMoreResources(
  page: number,
  limit: number,
  filters?: Pick<
    ContentListParams,
    "semester" | "majorId" | "search" | "price" | "verified" | "sort"
  >
): Promise<PaginatedResult<ResourceQueryItem>> {
  return getResources({ page, limit, ...filters })
}

export async function fetchMoreTutorialCollections(
  page: number,
  limit: number
): Promise<PaginatedResult<CollectionQueryItem>> {
  return getTutorialCollections({ page, limit })
}

export async function fetchMoreResourceCollections(
  page: number,
  limit: number
): Promise<PaginatedResult<CollectionQueryItem>> {
  return getResourceCollections({ page, limit })
}
