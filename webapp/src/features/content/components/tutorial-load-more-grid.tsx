"use client"

import { useCallback } from "react"

import { TutorialCard } from "@/components/molecules/tutorial-card"
import type { TutorialCardData } from "@/components/molecules/tutorial-card"
import type { PaginationMeta } from "@/types/api"

import { fetchMoreTutorials } from "../actions/explore.actions"
import { mapTutorialToCard } from "../mappers"
import type { ContentListParams } from "../types"

import { LoadMoreGrid } from "./load-more-grid"

interface Props {
  initialItems: TutorialCardData[]
  initialMeta: PaginationMeta
  filters?: Pick<ContentListParams, "semester" | "majorId" | "search">
}

export function TutorialLoadMoreGrid({
  initialItems,
  initialMeta,
  filters,
}: Props) {
  const fetchMore = useCallback(
    async (page: number, limit: number) => {
      const result = await fetchMoreTutorials(page, limit, filters)
      return {
        data: result.data.map(mapTutorialToCard),
        meta: result.meta,
      }
    },
    [filters]
  )

  return (
    <LoadMoreGrid
      initialItems={initialItems}
      initialMeta={initialMeta}
      fetchMore={fetchMore}
      renderItem={(tutorial) => <TutorialCard tutorial={tutorial} />}
      getKey={(item) => item.id}
    />
  )
}
