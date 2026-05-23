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

  // Props passed to the generated Facehash fallback.
  facehashProps?: ComponentProps<typeof AvatarFallback>["facehashProps"]
}

export function UserAvatar({
  src,
  name,
  className,
  alt,
  facehashProps,
  ...props
}: UserAvatarProps) {
  return (
    <Avatar className={cn("rounded-full", className)} {...props}>
      <AvatarImage src={src} alt={alt || name} />
      <AvatarFallback
        name={name}
        facehashProps={{
          enableBlink: true,
          ...facehashProps,
        }}
      />
    </Avatar>
  )
}
