"use client"

import React from "react"

import Link from "next/link"

import { Skeleton } from "boneyard-js/react"

import { cn } from "@/lib/utils"

export type WithSkeletonLinkProps = {
  isLoading?: boolean
  onClick?: () => void
  className?: string
}

export function WithSkeletonLink<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  skeletonName: string,
  getHref: (props: P) => string | undefined
) {
  return function SkeletonLinkHOC({
    isLoading = false,
    onClick,
    className,
    ...rest
  }: P & WithSkeletonLinkProps) {
    const href = getHref(rest as P)

    const wrapperClass = cn(
      "group flex h-full min-h-0 w-full flex-1 flex-col self-stretch overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      className
    )

    return (
      <Skeleton
        name={skeletonName}
        loading={isLoading}
        className="flex h-full flex-col items-stretch rounded-3xl *:data-boneyard-content:flex *:data-boneyard-content:h-full *:data-boneyard-content:min-h-0 *:data-boneyard-content:flex-1 *:data-boneyard-content:items-stretch [&>[data-boneyard-content]>*]:flex-1"
      >
        {isLoading || !href ? (
          <div className={wrapperClass}>
            <WrappedComponent {...(rest as P)} />
          </div>
        ) : (
          <Link href={href} onClick={onClick} className={wrapperClass}>
            <WrappedComponent {...(rest as P)} />
          </Link>
        )}
      </Skeleton>
    )
  }
}
