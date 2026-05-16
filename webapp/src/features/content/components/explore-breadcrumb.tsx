"use client"

import type { ReactNode } from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

type Crumb = {
  label: string
  href?: string
  icon?: ReactNode
}

const SEGMENT_LABELS: Record<string, string> = {
  explore: "Explore",
  resources: "Resources",
  tutorials: "Tutorials",
  collections: "Collections",
}

function toTitleCaseFromSlug(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean).map(decodeURIComponent)

  if (segments[0] !== "explore") {
    return []
  }

  const crumbs: Crumb[] = [
    {
      label: "Explore",
      href: "/explore",
    },
  ]

  for (let index = 1; index < segments.length; index++) {
    const segment = segments[index]
    const isLastSegment = index === segments.length - 1
    const label = SEGMENT_LABELS[segment] ?? toTitleCaseFromSlug(segment)

    let href: string | undefined = isLastSegment
      ? undefined
      : `/${segments.slice(0, index + 1).join("/")}`

    if (!isLastSegment && index === 2 && segment === "collections") {
      href = `/explore/${segments[1]}/collections`
    }

    crumbs.push({ label, href })
  }

  return crumbs
}

export function ExploreBreadcrumb() {
  const pathname = usePathname()
  const crumbs = buildCrumbs(pathname)

  if (crumbs.length === 0) {
    return null
  }

  return (
    <Breadcrumb>
      <BreadcrumbList className="gap-1.5 text-xs text-muted-foreground">
        {crumbs.map((crumb, index) => (
          <BreadcrumbItem key={`${crumb.href ?? "current"}-${crumb.label}`}>
            {crumb.href ? (
              <BreadcrumbLink
                asChild
                className="flex items-center gap-1 font-normal transition-colors hover:text-foreground"
              >
                <Link href={crumb.href}>
                  {crumb.icon}
                  {crumb.label}
                </Link>
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage className="font-medium text-foreground">
                {crumb.label}
              </BreadcrumbPage>
            )}

            {index < crumbs.length - 1 ? (
              <BreadcrumbSeparator className="text-muted-foreground/40">
                ›
              </BreadcrumbSeparator>
            ) : null}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
