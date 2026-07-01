import { Suspense } from "react"

import { getRecommendations } from "@/features/content/services/content.service"

import { RecommendationSectionContent } from "./recommendation-section-content"

interface Props {
  userId?: string
  contentType?: string
  /** Enable load more functionality */
  hasLoadMore?: boolean
  /** Items to show per page (Load More step) */
  pageSize?: number
}

async function RecommendationList({ userId, contentType, hasLoadMore = false, pageSize = 3 }: Props) {
  const fetchLimit = hasLoadMore ? 50 : pageSize
  const data = await getRecommendations(userId, fetchLimit, contentType)
  if (!data || !data.recommendations || data.recommendations.length === 0) {
    return null
  }

  const validItems = data.recommendations.filter(
    (item) => item.content != null || item.display?.title
  )

  if (validItems.length === 0) {
    return null
  }

  return (
    <RecommendationSectionContent
      items={validItems}
      pageSize={pageSize}
      hasLoadMore={hasLoadMore}
    />
  )
}

export function RecommendationSection(props: Props) {
  return (
    <Suspense fallback={<div className="h-48 w-full animate-pulse rounded-2xl bg-muted" />}>
      <RecommendationList {...props} />
    </Suspense>
  )
}
