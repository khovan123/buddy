"use client"

import { ComponentProps } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "facehash"

import { cn } from "@/lib/utils"

interface UserAvatarProps extends ComponentProps<typeof Avatar> {
  // Avatar image source (can be undefined/null if user has no avatar)
  src?: string | null

  // Name used to generate Facehash fallback deterministically
  name: string

  // Custom class for root avatar
  className?: string

  alt?: string
}

export function UserAvatar({
  src,
  name,
  className,
  alt,
  ...props
}: UserAvatarProps) {
  return (
    <Avatar className={cn("rounded-full", className)} {...props}>
      <AvatarImage src={src} alt={alt || name} />
      <AvatarFallback name={name} />
    </Avatar>
  )
}
