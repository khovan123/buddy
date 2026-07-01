import type { ReactNode } from "react"
import { Suspense } from "react"

import type { Metadata } from "next"

import { ExploreBackground } from "@/components/atoms/explore-background"
import { ExploreBreadcrumb } from "@/features/content"
import { ExploreFilterBarShell } from "@/features/content"
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
  const { majors, courses } = await getContentMeta()

  return (
    <>
      <ExploreBackground />
      <div className="flex flex-col gap-6">
        {/* ─── Toolbar: Breadcrumb + Filters ─── */}
        <div className="flex flex-col gap-4">
          {/* Breadcrumb Row */}
          <ExploreBreadcrumb />

          {/* Filter Bar */}
          <Suspense>
            <ExploreFilterBarShell majors={majors} courses={courses} />
          </Suspense>
        </div>

        {/* ─── Main Content ─── */}
        <div className="w-full">{children}</div>
      </div>
    </>
  )
}
