"use client"

import { usePathname } from "next/navigation"

import type { Course, Major } from "../types"

import { ExploreFilterBar } from "./explore-filter-bar"

interface ExploreFilterBarShellProps {
  majors: Major[]
  courses: Course[]
}

function isExploreDetailPath(pathname: string): boolean {
  return /^\/explore\/(resources|tutorials)(?:\/collections)?\/[^/]+$/.test(
    pathname
  )
}

export function ExploreFilterBarShell({
  majors,
  courses,
}: ExploreFilterBarShellProps) {
  const pathname = usePathname()

  if (isExploreDetailPath(pathname)) {
    return null
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card/30 px-4 py-3 backdrop-blur-md">
      <ExploreFilterBar majors={majors} courses={courses} />
    </div>
  )
}
