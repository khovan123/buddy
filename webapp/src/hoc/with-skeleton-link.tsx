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
      "group block h-full w-full overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      className
    )

    return (
      <Skeleton name={skeletonName} loading={isLoading} className="rounded-xl">
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
