"use client"

import type { ReactNode } from "react"
import { Fragment } from "react"

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
import { useI18n } from "@/i18n/language-provider"

type Crumb = {
  label: string
  href?: string
  icon?: ReactNode
}

function toTitleCaseFromSlug(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function buildCrumbs(
  pathname: string,
  labels: Record<string, string>
): Crumb[] {
  const segments = pathname.split("/").filter(Boolean).map(decodeURIComponent)

  if (segments[0] !== "explore") {
    return []
  }

  const crumbs: Crumb[] = [
    {
      label: labels.explore,
      href: "/explore",
    },
  ]

  for (let index = 1; index < segments.length; index++) {
    const segment = segments[index]
    const isLastSegment = index === segments.length - 1
    const label = labels[segment] ?? toTitleCaseFromSlug(segment)

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
  const { t } = useI18n()
  const pathname = usePathname()
  const crumbs = buildCrumbs(pathname, {
    explore: t("nav.explore"),
    resources: t("content.resources"),
    tutorials: t("content.tutorials"),
    collections: t("content.collections"),
  })

  if (crumbs.length === 0) {
    return null
  }

  return (
    <Breadcrumb>
      <BreadcrumbList className="gap-1.5 text-xs text-muted-foreground">
        {crumbs.map((crumb, index) => (
          <Fragment key={`${crumb.href ?? "current"}-${crumb.label}`}>
            <BreadcrumbItem>
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
            </BreadcrumbItem>

            {index < crumbs.length - 1 ? (
              <BreadcrumbSeparator className="text-muted-foreground/40">
                ›
              </BreadcrumbSeparator>
            ) : null}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
