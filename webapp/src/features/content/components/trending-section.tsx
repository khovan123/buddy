import { Suspense } from "react"

import { getTrending } from "@/features/content/services/content.service"

import { TrendingSectionContent } from "./trending-section-content"

interface Props {
  majorId?: string
  days?: number
  limit?: number
}

async function TrendingList({ majorId, days, limit = 6 }: Props) {
  const data = await getTrending(majorId, days, limit)
  if (!data || !data.items || data.items.length === 0) {
    return null
  }

  const validItems = data.items.filter(
    (item) => item.content != null || item.display?.title
  )

  if (validItems.length === 0) {
    return null
  }

  return <TrendingSectionContent items={validItems} />
}

export function TrendingSection(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="h-48 w-full animate-pulse rounded-2xl bg-muted" />
      }
    >
      <TrendingList {...props} />
    </Suspense>
  )
}
