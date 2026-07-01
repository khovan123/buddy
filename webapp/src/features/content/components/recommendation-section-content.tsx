"use client"

import { SectionHeading } from "@/components/atoms/section-heading"
import type { RecommendationItem } from "@/features/content/types"
import { useI18n } from "@/i18n/language-provider"

import { RecommendationGrid } from "./recommendation-grid"

interface RecommendationSectionContentProps {
  items: RecommendationItem[]
  pageSize: number
  hasLoadMore?: boolean
}

export function RecommendationSectionContent({
  items,
  pageSize,
  hasLoadMore = false,
}: RecommendationSectionContentProps) {
  const { t } = useI18n()

  return (
    <section className="space-y-5 rounded-2xl border border-border/80 bg-primary/5 p-6">
      <SectionHeading
        badge={t("recommendation.badge")}
        title={t("recommendation.title")}
        description={t("recommendation.description")}
      />
      <RecommendationGrid
        items={items}
        pageSize={pageSize}
        hasLoadMore={hasLoadMore}
      />
    </section>
  )
}
