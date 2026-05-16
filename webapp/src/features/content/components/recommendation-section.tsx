import { Suspense } from "react"

import { SectionHeading } from "@/components/atoms/section-heading"
import { getRecommendations } from "@/features/content/services/content.service"

import { RecommendationGrid } from "./recommendation-grid"

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

  const validItems = data.recommendations.filter((item) => item.content != null)

  if (validItems.length === 0) {
    return null
  }

  return (
    <section className="space-y-5 rounded-2xl border border-border/80 bg-primary/5 p-6">
      <SectionHeading
        badge="Just For You"
        title="Recommended for You"
        description="Personalized content based on your learning journey."
      />
      <RecommendationGrid items={validItems} pageSize={pageSize} hasLoadMore={hasLoadMore} />
    </section>
  )
}

export function RecommendationSection(props: Props) {
  return (
    <Suspense fallback={<div className="h-48 w-full animate-pulse rounded-2xl bg-muted" />}>
      <RecommendationList {...props} />
    </Suspense>
  )
}
