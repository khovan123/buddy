import type { ReactNode } from "react"

import Link from "next/link"

import { Button } from "@/components/ui/button"

type RelatedContentSectionProps<T> = {
  title: string
  actionLabel: string
  actionHref: string
  items: T[]
  renderItem: (item: T) => ReactNode
  emptyState?: string
  gridClassName?: string
}

export function RelatedContentSection<T>({
  title,
  actionLabel,
  actionHref,
  items,
  renderItem,
  emptyState = "No related items available.",
  gridClassName = "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4",
}: RelatedContentSectionProps<T>) {
  return (
    <section className="mt-8 border-t border-border pt-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <Button asChild variant="ghost" size="sm" className="font-bold">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      </div>

      {items.length > 0 ? (
        <div className={gridClassName}>
          {items.map((item) => renderItem(item))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyState}</p>
      )}
    </section>
  )
}
