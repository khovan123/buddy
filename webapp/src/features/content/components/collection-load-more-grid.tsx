"use client"

import { useCallback } from "react"

import { CollectionCard } from "@/components/molecules/collection-card"
import type { CollectionCardData } from "@/components/molecules/collection-card"
import type { PaginationMeta } from "@/types/api"

import {
  fetchMoreResourceCollections,
  fetchMoreTutorialCollections,
} from "../actions/explore.actions"
import { mapCollectionToCard } from "../mappers"
import type { ContentListParams } from "../types"

import { LoadMoreGrid } from "./load-more-grid"

interface Props {
  initialItems: CollectionCardData[]
  initialMeta: PaginationMeta
  collectionType: "resource" | "tutorial"
  filters?: Pick<ContentListParams, "search" | "courseId">
}

export function CollectionLoadMoreGrid({
  initialItems,
  initialMeta,
  collectionType,
  filters,
}: Props) {
  const gridKey = JSON.stringify({
    collectionType,
    filters: filters ?? null,
    page: initialMeta.page,
    total: initialMeta.total,
    ids: initialItems.map((item) => item.id),
  })

  const fetchMore = useCallback(
    async (page: number, limit: number) => {
      const result =
        collectionType === "tutorial"
          ? await fetchMoreTutorialCollections(page, limit, filters)
          : await fetchMoreResourceCollections(page, limit, filters)
      return {
        data: result.data.map((c) => mapCollectionToCard(c, collectionType)),
        meta: result.meta,
      }
    },
    [collectionType, filters]
  )

  return (
    <LoadMoreGrid
      key={gridKey}
      initialItems={initialItems}
      initialMeta={initialMeta}
      fetchMore={fetchMore}
      renderItem={(collection) => <CollectionCard collection={collection} />}
      getKey={(item) => item.title}
    />
  )
}
