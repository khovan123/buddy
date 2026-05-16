"use server"

import type { ProfileItem } from "@/components/molecules/profile-card"
import {
  getMyResourceCollections,
  getMyResources,
  getMyTutorialCollections,
  getMyTutorials,
  getResourceCollections,
  getResources,
  getTutorialCollections,
  getTutorials,
} from "@/features/content/services/content.service"

import {
  mapResourceCollectionToProfileItem,
  mapResourceToProfileItem,
  mapTutorialCollectionToProfileItem,
  mapTutorialToProfileItem,
} from "../mappers"

export type ProfileTab = "tutorials" | "resources" | "collections"

type TabResult = { items: ProfileItem[]; total: number }

// ── Current user's profile (uses /me endpoints) ─────────────

export async function fetchProfileTab(tab: ProfileTab): Promise<TabResult> {
  switch (tab) {
    case "tutorials": {
      const res = await getMyTutorials()
      return {
        items: (res.data || []).map(mapTutorialToProfileItem),
        total: res.meta.total,
      }
    }
    case "resources": {
      const res = await getMyResources()
      return {
        items: (res.data || []).map(mapResourceToProfileItem),
        total: res.meta.total,
      }
    }
    case "collections": {
      const [tutCols, resCols] = await Promise.all([
        getMyTutorialCollections(),
        getMyResourceCollections(),
      ])
      return {
        items: [
          ...(tutCols.data || []).map(mapTutorialCollectionToProfileItem),
          ...(resCols.data || []).map(mapResourceCollectionToProfileItem),
        ],
        total: tutCols.meta.total + resCols.meta.total,
      }
    }
  }
}

// ── Public profile by userId ────────────────────────────────

export async function fetchUserProfileTab(
  userId: string,
  tab: ProfileTab
): Promise<TabResult> {
  switch (tab) {
    case "tutorials": {
      const res = await getTutorials({ userId })
      return {
        items: (res.data || []).map(mapTutorialToProfileItem),
        total: res.meta.total,
      }
    }
    case "resources": {
      const res = await getResources({ userId })
      return {
        items: (res.data || []).map(mapResourceToProfileItem),
        total: res.meta.total,
      }
    }
    case "collections": {
      const [tutCols, resCols] = await Promise.all([
        getTutorialCollections({ userId }),
        getResourceCollections({ userId }),
      ])
      return {
        items: [
          ...(tutCols.data || []).map(mapTutorialCollectionToProfileItem),
          ...(resCols.data || []).map(mapResourceCollectionToProfileItem),
        ],
        total: tutCols.meta.total + resCols.meta.total,
      }
    }
  }
}
