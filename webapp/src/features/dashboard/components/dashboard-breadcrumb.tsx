"use client"

import React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { ChevronRightIcon } from "lucide-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { navMain } from "./dashboard-sidebar"

type CrumbType = "root" | "group" | "page"

interface Crumb {
  title: string
  url?: string
  type: CrumbType
}

export function DashboardBreadcrumb() {
  const pathname = usePathname()

  const generateBreadcrumbs = () => {
    const breadcrumbs: Crumb[] = []

    breadcrumbs.push({ title: "Dashboard", url: "/dashboard", type: "root" })

    if (pathname === "/dashboard") {
      return breadcrumbs
    }

    for (const group of navMain) {
      if (group.url === pathname && group.url !== "/dashboard") {
        breadcrumbs.push({ title: group.title, url: group.url, type: "page" })
        break
      }

      const activeSub = group.items?.find((sub) => pathname.startsWith(sub.url))
      if (activeSub) {
        breadcrumbs.push({ title: group.title, type: "group" })
        breadcrumbs.push({
          title: activeSub.title,
          url: activeSub.url,
          type: "page",
        })
        break
      }
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  // Get other groups to populate the dropdown
  const getNavGroupUrl = (group: (typeof navMain)[0]) => {
    return group.url !== "#" ? group.url : group.items?.[0]?.url || "#"
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1

          return (
            <React.Fragment key={crumb.title + crumb.url}>
              <BreadcrumbItem className="hidden md:block">
                {crumb.type === "group" ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="group flex items-center gap-1 transition-colors outline-none hover:text-foreground">
                      {crumb.title}
                      <ChevronRightIcon className="size-3.5 transition-transform duration-200 group-hover:rotate-90 group-data-[state=open]:rotate-90" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuGroup>
                        {navMain
                          .filter((group) => group.title !== crumb.title)
                          .map((group) => (
                            <DropdownMenuItem key={group.title} asChild>
                              <Link href={getNavGroupUrl(group)}>
                                <span className="flex items-center gap-2">
                                  <group.icon className="size-4 text-muted-foreground" />
                                  {group.title}
                                </span>
                              </Link>
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : isLast ? (
                  <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                ) : crumb.url ? (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.url}>{crumb.title}</Link>
                  </BreadcrumbLink>
                ) : (
                  <span className="text-muted-foreground mix-blend-normal transition-colors group-hover:text-foreground">
                    {crumb.title}
                  </span>
                )}
              </BreadcrumbItem>
              {!isLast && crumb.type !== "group" && (
                <BreadcrumbSeparator className="hidden md:block" />
              )}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
