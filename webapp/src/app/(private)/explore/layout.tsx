import type { ReactNode } from "react"
import { Suspense } from "react"

import type { Metadata } from "next"

import { ExploreBackground } from "@/components/atoms/explore-background"
import { ExploreBreadcrumb } from "@/features/content"
import { ExploreFilterBar } from "@/features/content"
import { getContentMeta } from "@/features/content"

export const metadata: Metadata = {
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

export default async function ExploreLayout({
  children,
}: {
  children: ReactNode
}) {
  const { majors } = await getContentMeta()

  return (
    <>
      <ExploreBackground />
      <div className="flex flex-col gap-6">
        {/* ─── Toolbar: Breadcrumb + Filters ─── */}
        <div className="flex flex-col gap-4">
          {/* Breadcrumb Row */}
          <ExploreBreadcrumb />

          {/* Filter Bar */}
          <div className="rounded-xl border border-border/40 bg-card/30 px-4 py-3 backdrop-blur-md">
            <Suspense>
              <ExploreFilterBar majors={majors} />
            </Suspense>
          </div>
        </div>

        {/* ─── Main Content ─── */}
        <div className="w-full">{children}</div>
      </div>
    </>
  )
}
