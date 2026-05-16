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

import { LoadMoreGrid } from "./load-more-grid"

interface Props {
  initialItems: CollectionCardData[]
  initialMeta: PaginationMeta
  collectionType: "resource" | "tutorial"
}

export function CollectionLoadMoreGrid({
  initialItems,
  initialMeta,
  collectionType,
}: Props) {
  const fetchMore = useCallback(
    async (page: number, limit: number) => {
      const result =
        collectionType === "tutorial"
          ? await fetchMoreTutorialCollections(page, limit)
          : await fetchMoreResourceCollections(page, limit)
      return {
        data: result.data.map((c) => mapCollectionToCard(c, collectionType)),
        meta: result.meta,
      }
    },
    [collectionType]
  )

  return (
    <LoadMoreGrid
      initialItems={initialItems}
      initialMeta={initialMeta}
      fetchMore={fetchMore}
      renderItem={(collection) => <CollectionCard collection={collection} />}
      getKey={(item) => item.title}
    />
  )
}
