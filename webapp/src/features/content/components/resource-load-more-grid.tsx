"use client"

import { useCallback } from "react"

import { ResourceCard } from "@/components/molecules/resource-card"
import type { ResourceCardData } from "@/components/molecules/resource-card"
import type { PaginationMeta } from "@/types/api"

import { fetchMoreResources } from "../actions/explore.actions"
import { mapResourceToCard } from "../mappers"
import type { ContentListParams } from "../types"

import { LoadMoreGrid } from "./load-more-grid"

interface Props {
  initialItems: ResourceCardData[]
  initialMeta: PaginationMeta
  filters?: Pick<
    ContentListParams,
    "semester" | "majorId" | "courseId" | "search" | "verified" | "sort"
  >
}

export function ResourceLoadMoreGrid({
  initialItems,
  initialMeta,
  filters,
}: Props) {
  const gridKey = JSON.stringify({
    filters: filters ?? null,
    page: initialMeta.page,
    total: initialMeta.total,
    ids: initialItems.map((item) => item.id),
  })

  const fetchMore = useCallback(
    async (page: number, limit: number) => {
      const result = await fetchMoreResources(page, limit, filters)
      return {
        data: result.data.map(mapResourceToCard),
        meta: result.meta,
      }
    },
    [filters]
  )

  return (
    <LoadMoreGrid
      key={gridKey}
      initialItems={initialItems}
      initialMeta={initialMeta}
      fetchMore={fetchMore}
      renderItem={(resource) => <ResourceCard resource={resource} />}
      getKey={(item) => item.id}
    />
  )
}
